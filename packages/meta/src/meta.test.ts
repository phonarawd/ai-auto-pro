import { describe, expect, it } from "vitest";
import { createSqliteStorage } from "@clime/storage";
import { createExecutiveEngine } from "./executive.js";
import { createGoalManager } from "./goal-manager.js";
import { ESTIMATE_LABEL } from "./schemas.js";

describe("@clime/meta Executive + Goal", () => {
  it("setGoal / getGoals / Goal→KPI→Mission link for week horizon", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "J-B" });
      const goals = createGoalManager(storage);
      const { goalId } = await goals.setGoal({
        projectId,
        horizon: "week",
        title: "Organic reels week",
        target: 20,
        theme: "reels focus",
        kpis: [
          { key: "reels_count", target: 20, unit: "count" },
          { key: "signups", target: 50, unit: "count" },
        ],
        mixCaps: { reels: 20, blogs: 5, shorts: 15 },
      });
      expect(goalId).toBeTruthy();

      const list = await goals.getGoals(projectId, "week");
      expect(list).toHaveLength(1);
      expect(list[0]!.horizon).toBe("week");
      expect(list[0]!.kpi.kpis).toHaveLength(2);
      expect(list[0]!.kpi.mixCaps?.reels).toBe(20);

      const linked = await goals.linkMission({
        goalId,
        missionId: "mission_tpl_1",
        title: "Reels batch template",
      });
      expect(linked.linked).toBe(true);

      const chain = await goals.getGoalChain(goalId);
      expect(chain?.kind).toBe("meta.goal_chain");
      expect(chain?.missionLinks).toHaveLength(1);
      expect(chain?.missionLinks[0]!.missionId).toBe("mission_tpl_1");
      expect(chain?.kpis[0]!.key).toBe("reels_count");
    } finally {
      storage.close();
    }
  });

  it("getHorizon + getReallocations use week/month/quarter only; estimates labeled", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "J-B-h" });
      const goals = createGoalManager(storage);
      const executive = createExecutiveEngine(storage, goals);

      await goals.setGoal({
        projectId,
        horizon: "month",
        title: "Month growth",
        mixCaps: { reels: 80, blogs: 10 },
      });

      const horizon = await executive.getHorizon({
        projectId,
        horizon: "month",
      });
      expect(horizon.kind).toBe("meta.horizon_status");
      expect(horizon.horizon).toBe("month");
      expect(horizon.status).toBe("active");
      expect(horizon.constraintHint).toContain("month:");
      expect(horizon.narrative).toContain("Decision Engine alone ranks today");

      const realloc = await executive.getReallocations({
        projectId,
        horizon: "month",
      });
      expect(realloc.kind).toBe("meta.reallocation_list");
      expect(realloc.items.length).toBeGreaterThan(0);
      const estimated = realloc.items.filter((i) => i.isEstimate);
      expect(estimated.length).toBeGreaterThan(0);
      for (const item of estimated) {
        expect(item.estimateLabel).toBe(ESTIMATE_LABEL);
      }
    } finally {
      storage.close();
    }
  });

  it("explainDecision is read-only — does not create DecisionRecord", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "J-B-e" });
      const goals = createGoalManager(storage);
      const executive = createExecutiveEngine(storage, goals);

      const before = await storage.decisions.latestForProject(projectId);
      expect(before).toBeNull();

      const explained = await executive.explainDecision({ projectId });
      expect(explained.kind).toBe("meta.executive_explain");
      expect(explained.horizonNote).toContain("Decision Engine alone ranks today");

      const after = await storage.decisions.latestForProject(projectId);
      expect(after).toBeNull();
    } finally {
      storage.close();
    }
  });

  it("rejects inventing day horizon via setGoal", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "J-B-d" });
      const goals = createGoalManager(storage);
      await expect(
        goals.setGoal({
          projectId,
          // @ts-expect-error day is forbidden
          horizon: "day",
          title: "Daily takeover",
        }),
      ).rejects.toThrow();
    } finally {
      storage.close();
    }
  });
});
