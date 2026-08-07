import { describe, expect, it } from "vitest";
import { createSqliteStorage } from "@clime/storage";
import { createDecisionDomainHandlers } from "./api.js";
import { createDecisionEngine } from "./engine.js";
import { decisionGraphSchema, ESTIMATE_LABEL } from "./schemas.js";

describe("E-C Decision Engine", () => {
  it("runDailyDecision writes Decision Graph, Mission, and Queue via planning producer", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "E-C" });
      const engine = createDecisionEngine(storage);
      const result = await engine.runDailyDecision({
        projectId,
        missionDate: "2026-08-07",
        traceId: "tr_e_c",
        trendLabel: "AI growth",
        keywordLabel: "CLIME",
      });

      expect(result.estimateLabel).toBe(ESTIMATE_LABEL);
      expect(result.queueItemIds.length).toBeGreaterThan(0);
      expect(result.graph.kind).toBe("growth.decision_graph");
      decisionGraphSchema.parse(result.graph);
      expect(
        result.graph.nodes.some((n) => n.type === "PlannerQueueItem"),
      ).toBe(true);

      const today = await engine.getMissionToday({
        projectId,
        missionDate: "2026-08-07",
      });
      expect(today.missions.length).toBeGreaterThan(0);
      expect(today.decisionExplain).toContain("Why Today");
      expect(today.decisionId).toBe(result.decisionId);
      expect(today.estimateLabel).toBe("추정");
      expect(today.queueDepth).toBeGreaterThan(0);

      const explained = await engine.explainDecision({ projectId });
      expect(explained.explanation).toContain("Why Today");
      expect(explained.estimateLabel).toBe("추정");
      expect(explained.graph?.kind).toBe("growth.decision_graph");

      const queue = await engine.listPlannerQueue({ projectId });
      expect(queue.length).toBeGreaterThan(0);
      const first = queue[0] as { decisionId: string; status: string };
      expect(first.decisionId).toBe(result.decisionId);
      expect(first.status).toBe("ready");
    } finally {
      storage.close();
    }
  });

  it("domain handlers own getMissionToday / runDailyDecision", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "E-C-H" });
      const handlers = createDecisionDomainHandlers(
        createDecisionEngine(storage),
        { defaultProjectId: projectId },
      );
      const decided = (await handlers["growth.runDailyDecision"]!(
        { missionDate: "2026-08-07" },
        { requestId: "r1", traceId: "t1" },
      )) as { decisionId: string; queueItemIds: string[] };
      expect(decided.decisionId).toBeTruthy();
      expect(decided.queueItemIds.length).toBeGreaterThan(0);

      const today = (await handlers["growth.getMissionToday"]!(
        { missionDate: "2026-08-07" },
        { requestId: "r2", traceId: "t2" },
      )) as { missions: unknown[]; decisionExplain?: string };
      expect(today.missions.length).toBeGreaterThan(0);
      expect(today.decisionExplain).toBeTruthy();
    } finally {
      storage.close();
    }
  });
});
