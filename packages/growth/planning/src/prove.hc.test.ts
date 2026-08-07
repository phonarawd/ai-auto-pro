import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createSqliteStorage } from "@clime/storage";
import { enqueueFromDecision } from "./queue-producer.js";
import {
  bufferDecisionItems,
  suggestSchedule,
} from "./scheduler-intelligence.js";

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTsFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

describe("H-C planning prove — Queue producer + Scheduler intel", () => {
  it("Scheduler Intelligence + volume buffer exist under growth/planning", () => {
    expect(existsSync(join(process.cwd(), "src", "scheduler-intelligence.ts"))).toBe(
      true,
    );
    expect(existsSync(join(process.cwd(), "src", "queue-producer.ts"))).toBe(true);
    const schedule = suggestSchedule([{ priority: 1, expectedRoi: 0.5 }], {
      now: new Date("2026-08-07T01:00:00.000Z"),
    });
    expect(schedule.kind).toBe("growth.schedule_suggestion");
    const buffered = bufferDecisionItems({
      items: Array.from({ length: 12 }, (_, i) => ({
        priority: 1,
        expectedRoi: i / 12,
      })),
    });
    expect(buffered.kept.length).toBeLessThanOrEqual(10);
    expect(buffered.dropped.length).toBeGreaterThan(0);
  });

  it("enqueueFromDecision never leases Workers; status stays ready", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "H-C" });
      const { queueItemIds } = await enqueueFromDecision(storage, {
        projectId,
        decisionId: "dec_hc",
        missionId: "mis_hc",
        items: [
          {
            priority: 1,
            expectedRoi: 0.6,
            payload: {
              schema_version: 1,
              kind: "growth.decision_queue_work",
              title: "prove",
            },
          },
        ],
        now: new Date("2026-08-07T01:00:00.000Z"),
      });
      const row = await storage.plannerQueue.getById(queueItemIds[0]!);
      expect(row?.status).toBe("ready");
      expect(row?.leasedBy).toBeNull();
      expect(row?.deadline).toBeTruthy();
    } finally {
      storage.close();
    }
  });

  it("domain exit 0 — planning must not import automation/workflow/decision", () => {
    const root = join(process.cwd(), "src");
    for (const file of listTsFiles(root)) {
      if (file.endsWith(".test.ts")) continue;
      const src = readFileSync(file, "utf8");
      expect(src).not.toMatch(/from\s+["']@clime\/automation["']/);
      expect(src).not.toMatch(/from\s+["']@clime\/workflow["']/);
      expect(src).not.toMatch(/from\s+["']@clime\/growth-decision["']/);
      expect(src).not.toMatch(/plannerQueue\.lease/);
    }
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };
    const deps = Object.keys(pkg.dependencies ?? {});
    expect(deps).not.toContain("@clime/automation");
    expect(deps).not.toContain("@clime/growth-decision");
  });
});
