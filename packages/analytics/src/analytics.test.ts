import { describe, expect, it } from "vitest";
import { createSqliteStorage } from "@clime/storage";
import { createAnalyticsDomainHandlers } from "./api.js";
import { createAnalyticsEngine } from "./engine.js";
import { createExperimentResultSchema, experimentDocSchema } from "./schemas.js";

describe("H-B analytics Experiment A/B + HumanGate spend", () => {
  it("creates organic A/B experiment with control + title arms", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "H-B" });
      const engine = createAnalyticsEngine(storage);
      const result = await engine.createExperiment({
        projectId,
        name: "Title A/B",
        traceId: "tr_org",
      });
      const parsed = createExperimentResultSchema.parse(result);
      expect(parsed.ok).toBe(true);
      expect(parsed.autoSpendApplied).toBe(0);
      expect(parsed.humanGateRequired).toBe(false);
      expect(parsed.experimentId).toBeTruthy();

      const list = await engine.listExperiments(projectId);
      expect(list).toHaveLength(1);
      const doc = experimentDocSchema.parse(list[0]);
      expect(doc.arms.length).toBeGreaterThanOrEqual(2);
      expect(doc.autoSpendApplied).toBe(0);
      expect(doc.status).toBe("running");
    } finally {
      storage.close();
    }
  });

  it("spend > 0 without humanApproved → BLOCKED_HUMAN and autoSpendApplied=0", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "H-B-spend" });
      const engine = createAnalyticsEngine(storage);
      const blocked = await engine.createExperiment({
        projectId,
        name: "Paid boost test",
        spend: 50,
        traceId: "tr_block",
      });
      expect(blocked.ok).toBe(false);
      expect(blocked.terminal).toBe("BLOCKED_HUMAN");
      expect(blocked.humanGateRequired).toBe(true);
      expect(blocked.autoSpendApplied).toBe(0);
      expect(await engine.listExperiments(projectId)).toHaveLength(0);

      const approved = await engine.createExperiment({
        projectId,
        name: "Paid boost gated",
        spend: 50,
        humanApproved: true,
        traceId: "tr_ok",
      });
      expect(approved.ok).toBe(true);
      expect(approved.autoSpendApplied).toBe(0);
      expect(approved.humanGateRequired).toBe(true);
      expect(approved.experiment?.autoSpendApplied).toBe(0);
      expect(approved.experiment?.spendRequested).toBe(50);
      expect(approved.experiment?.status).toBe("draft");
    } finally {
      storage.close();
    }
  });

  it("domain handlers analytics.createExperiment / listExperiments", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "H-B-API" });
      const engine = createAnalyticsEngine(storage);
      const handlers = createAnalyticsDomainHandlers(engine, {
        defaultProjectId: projectId,
      });

      const created = (await handlers["analytics.createExperiment"]!(
        { name: "CTA test", projectId },
        { requestId: "r1", traceId: "tr_api", projectId },
      )) as { ok: boolean; experimentId?: string; autoSpendApplied: number };

      expect(created.ok).toBe(true);
      expect(created.autoSpendApplied).toBe(0);

      const listed = (await handlers["analytics.listExperiments"]!(
        { projectId },
        { requestId: "r2", traceId: "tr_list", projectId },
      )) as unknown[];
      expect(listed).toHaveLength(1);
    } finally {
      storage.close();
    }
  });
});
