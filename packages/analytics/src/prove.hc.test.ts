import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createSqliteStorage } from "@clime/storage";
import { createAnalyticsEngine } from "./engine.js";

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTsFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

describe("H-C analytics prove — HumanGate spend seat + domain exit 0", () => {
  it("package home is @clime/analytics (no Paid Ads OS)", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { name?: string };
    expect(pkg.name).toBe("@clime/analytics");
    expect(existsSync(join(process.cwd(), "src", "engine.ts"))).toBe(true);
  });

  it("spend path is HumanGate-only; autoSpendApplied always 0", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "H-C-exp" });
      const engine = createAnalyticsEngine(storage);

      const blocked = await engine.createExperiment({
        projectId,
        name: "Spend attempt",
        spend: 100,
      });
      expect(blocked.ok).toBe(false);
      expect(blocked.terminal).toBe("BLOCKED_HUMAN");
      expect(blocked.autoSpendApplied).toBe(0);

      const gated = await engine.createExperiment({
        projectId,
        name: "Spend approved seat",
        spend: 100,
        humanApproved: true,
      });
      expect(gated.ok).toBe(true);
      expect(gated.autoSpendApplied).toBe(0);
      expect(gated.experiment?.autoSpendApplied).toBe(0);
      expect(gated.humanGateRequired).toBe(true);
    } finally {
      storage.close();
    }
  });

  it("domain exit 0 — analytics must not emit Planner Queue or daily Decision", () => {
    const root = join(process.cwd(), "src");
    for (const file of listTsFiles(root)) {
      if (file.endsWith(".test.ts")) continue;
      const src = readFileSync(file, "utf8");
      expect(src).not.toMatch(/enqueueFromDecision/);
      expect(src).not.toMatch(/plannerQueue/);
      expect(src).not.toMatch(/runDailyDecision/);
      expect(src).not.toMatch(/from\s+["']@clime\/growth-decision["']/);
      expect(src).not.toMatch(/from\s+["']@clime\/automation["']/);
      expect(src).not.toMatch(/from\s+["']@clime\/growth-planning["']/);
    }
  });

  it("no packages/viral or parallel Ads OS package invented by H", () => {
    // analytics lives at packages/analytics → parent = packages/
    const packagesDir = join(process.cwd(), "..");
    expect(existsSync(join(packagesDir, "analytics"))).toBe(true);
    expect(existsSync(join(packagesDir, "viral"))).toBe(false);
    expect(existsSync(join(packagesDir, "ads"))).toBe(false);
  });
});
