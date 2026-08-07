import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createSqliteStorage } from "@clime/storage";
import { createExecutiveDomainHandlers } from "./api.js";
import { createExecutiveEngine } from "./executive.js";
import { createGoalManager } from "./goal-manager.js";
import { ESTIMATE_LABEL } from "./schemas.js";

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTsFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

describe("J-C Executive Prove — daily=Decision only · Meta slim", () => {
  it("Meta package exists and exports Executive + Goal only (no Reflection/Cost)", () => {
    const root = join(process.cwd());
    expect(existsSync(join(root, "package.json"))).toBe(true);
    const pkg = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    ) as { name: string; dependencies?: Record<string, string> };
    expect(pkg.name).toBe("@clime/meta");
    expect(pkg.dependencies?.["@clime/learning"]).toBeUndefined();
    expect(pkg.dependencies?.["@clime/ai"]).toBeUndefined();

    const srcFiles = listTsFiles(join(root, "src")).filter(
      (f) => !f.endsWith(".test.ts"),
    );
    const joined = srcFiles.map((f) => readFileSync(f, "utf8")).join("\n");
    expect(joined).toMatch(/createExecutiveEngine/);
    expect(joined).toMatch(/createGoalManager/);
    expect(joined).not.toMatch(/Reflection/);
    expect(joined).not.toMatch(/CostIntelligence|createCost/);
    expect(joined).not.toMatch(/runDailyDecision/);
    expect(joined).not.toMatch(/decisions\.create/);
    expect(joined).not.toMatch(/plannerQueue/);
    expect(joined).not.toMatch(/enqueueFromDecision/);
  });

  it("Goal→KPI→Mission + horizon envelopes; no DecisionRecord writes", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "J-C" });
      const goals = createGoalManager(storage);
      const executive = createExecutiveEngine(storage, goals);
      const handlers = createExecutiveDomainHandlers(executive, goals, {
        defaultProjectId: projectId,
      });

      const setRes = (await handlers["executive.setGoal"]!(
        {
          horizon: "quarter",
          title: "Q growth",
          mixCaps: { reels: 60, blogs: 12 },
          kpis: [{ key: "signups", target: 200, unit: "count" }],
        },
        { requestId: "r1", traceId: "tr_jc" },
      )) as { goalId: string };
      expect(setRes.goalId).toBeTruthy();

      await handlers["executive.linkMission"]!(
        { goalId: setRes.goalId, missionId: "m1", title: "Template" },
        { requestId: "r2", traceId: "tr_jc" },
      );

      const chain = (await handlers["executive.getGoalChain"]!(
        { goalId: setRes.goalId },
        { requestId: "r3", traceId: "tr_jc" },
      )) as { kind: string; missionLinks: unknown[]; kpis: unknown[] };
      expect(chain.kind).toBe("meta.goal_chain");
      expect(chain.missionLinks).toHaveLength(1);
      expect(chain.kpis).toHaveLength(1);

      const horizon = (await handlers["executive.getHorizon"]!(
        { horizon: "quarter" },
        { requestId: "r4", traceId: "tr_jc" },
      )) as { kind: string; horizon: string; narrative: string };
      expect(horizon.kind).toBe("meta.horizon_status");
      expect(horizon.horizon).toBe("quarter");
      expect(horizon.narrative).toContain("Decision Engine alone ranks today");

      const realloc = (await handlers["executive.getReallocations"]!(
        { horizon: "quarter" },
        { requestId: "r5", traceId: "tr_jc" },
      )) as {
        items: Array<{ isEstimate: boolean; estimateLabel?: string }>;
      };
      const estimated = realloc.items.filter((i) => i.isEstimate);
      expect(estimated.length).toBeGreaterThan(0);
      for (const item of estimated) {
        expect(item.estimateLabel).toBe(ESTIMATE_LABEL);
      }

      expect(await storage.decisions.latestForProject(projectId)).toBeNull();
      expect(
        (await storage.plannerQueue.listByProject(projectId, 10)).length,
      ).toBe(0);
    } finally {
      storage.close();
    }
  });

  it("daily emitter remains under growth-decision only", () => {
    const decisionSrc = join(process.cwd(), "../growth/decision/src");
    expect(existsSync(decisionSrc)).toBe(true);
    let hasRunDaily = false;
    for (const file of listTsFiles(decisionSrc)) {
      if (file.endsWith(".test.ts")) continue;
      const src = readFileSync(file, "utf8");
      if (src.includes("runDailyDecision")) hasRunDaily = true;
    }
    expect(hasRunDaily).toBe(true);

    for (const file of listTsFiles(join(process.cwd(), "src"))) {
      if (file.endsWith(".test.ts")) continue;
      const src = readFileSync(file, "utf8");
      expect(src).not.toMatch(/runDailyDecision/);
    }
  });
});
