import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createSqliteStorage } from "@clime/storage";
import { createDecisionEngine } from "./engine.js";

function listDirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTsFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

describe("E-D Decide Prove", () => {
  it("growth packages = research + planning + decision + revenue + knowledge (no viral)", () => {
    const growthRoot = join(process.cwd(), "..");
    const dirs = listDirs(growthRoot).sort();
    // K1 adds growth/knowledge; Growth umbrella remains five — never `viral`.
    expect(dirs).toEqual([
      "decision",
      "knowledge",
      "planning",
      "research",
      "revenue",
    ]);
    expect(existsSync(join(growthRoot, "viral"))).toBe(false);
  });

  it("daily emitter is Decision only — no Executive daily writer in growth", () => {
    const decisionSrc = join(process.cwd(), "src");
    const revenueSrc = join(process.cwd(), "..", "revenue", "src");
    const planningSrc = join(process.cwd(), "..", "planning", "src");

    let decisionHasRunDaily = false;
    for (const file of listTsFiles(decisionSrc)) {
      if (file.endsWith(".test.ts")) continue;
      const src = readFileSync(file, "utf8");
      if (src.includes("runDailyDecision")) decisionHasRunDaily = true;
      expect(src).not.toMatch(/from\s+["']@clime\/meta["']/);
      expect(src).not.toMatch(/from\s+["']@clime\/automation["']/);
    }
    expect(decisionHasRunDaily).toBe(true);

    for (const root of [revenueSrc, planningSrc]) {
      for (const file of listTsFiles(root)) {
        if (file.endsWith(".test.ts")) continue;
        const src = readFileSync(file, "utf8");
        expect(src, file).not.toMatch(/runDailyDecision/);
        expect(src, file).not.toMatch(/decisions\.create/);
      }
    }

    // Meta / Executive package must not own daily DecisionRecord writes
    const metaSrc = join(process.cwd(), "../../meta/src");
    if (existsSync(metaSrc)) {
      for (const file of listTsFiles(metaSrc)) {
        if (file.endsWith(".test.ts")) continue;
        const src = readFileSync(file, "utf8");
        expect(src, file).not.toMatch(/runDailyDecision/);
        expect(src, file).not.toMatch(/decisions\.create/);
        expect(src, file).not.toMatch(/plannerQueue\./);
        expect(src, file).not.toMatch(/enqueueFromDecision/);
      }
    }
  });

  it("Queue producer path + Mission Center today link GREEN", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "E-D" });
      const engine = createDecisionEngine(storage);
      const result = await engine.runDailyDecision({
        projectId,
        missionDate: "2026-08-07",
        traceId: "tr_ed",
        horizonHint: "week: ≤5 blogs (envelope only)",
      });

      expect(result.queueItemIds.length).toBeGreaterThan(0);
      expect(result.estimateLabel).toBe("추정");
      expect(result.graph.kind).toBe("growth.decision_graph");
      expect(result.narrative).toContain("Executive does not rank today");

      const today = await engine.getMissionToday({
        projectId,
        missionDate: "2026-08-07",
      });
      expect(today.missions[0]?.decisionId).toBe(result.decisionId);
      expect(today.decisionExplain).toBeTruthy();
      expect(today.queueDepth).toBeGreaterThan(0);

      const queueRow = await storage.plannerQueue.getById(result.queueItemIds[0]!);
      expect(queueRow?.status).toBe("ready");
      expect(queueRow?.leasedBy).toBeNull();
    } finally {
      storage.close();
    }
  });
});
