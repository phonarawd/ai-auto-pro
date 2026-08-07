import { describe, expect, it } from "vitest";
import { createSqliteStorage } from "@clime/storage";
import { createResearchEngine } from "./engine.js";
import { createResearchDomainHandlers } from "./api.js";
import { createGoogleTrendsPublicSource } from "./sources.js";
import { multiJackContentHookSchema } from "./schemas.js";

describe("D-B growth/research", () => {
  it("ingests free public source without API key, normalizes, builds keyword graph", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "D-B" });
      const engine = createResearchEngine(storage, {
        sources: [createGoogleTrendsPublicSource()],
      });

      const job = await engine.runResearchJob({
        projectId,
        traceId: "tr_db_1",
      });
      expect(job.jobId).toMatch(/^job_/);
      expect(job.trendCount).toBeGreaterThan(0);
      expect(job.graphNodeCount).toBeGreaterThan(0);

      const trends = await engine.getNormalizedTrends(projectId);
      expect(trends[0]?.schema_version).toBe(1);
      expect(trends[0]?.kind).toBe("growth.normalized_trend");
      expect(trends[0]?.formatTips.length).toBeGreaterThan(0);

      const graph = await engine.getKeywordGraph(projectId);
      expect(graph.kind).toBe("growth.keyword_graph");
      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);
    } finally {
      storage.close();
    }
  });

  it("builds Multi-Jack content hook with paidApiRequired=false (vg-a §2 seed only)", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "D-B-MJ" });
      const engine = createResearchEngine(storage);
      await engine.runResearchJob({ projectId, traceId: "tr_mj" });
      const trends = await engine.getNormalizedTrends(projectId);
      const trendId = trends[0]!.id;

      const result = await engine.buildMultiJackHook({ projectId, trendId });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const hook = multiJackContentHookSchema.parse(result.hook);
      expect(hook.kind).toBe("growth.multi_jack_content_hook");
      expect(hook.paidApiRequired).toBe(false);
      expect(hook.hotTopic.length).toBeGreaterThan(0);
      // Must NOT be a variant pack — no channel artifacts
      expect(result.hook).not.toHaveProperty("variants");
      expect(result.hook).not.toHaveProperty("channels");
    } finally {
      storage.close();
    }
  });

  it("domain handlers expose research channels", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "D-B-API" });
      const engine = createResearchEngine(storage);
      const handlers = createResearchDomainHandlers(engine, { defaultProjectId: projectId });

      const ack = (await handlers["growth.runResearchJob"]!(
        { projectId },
        { requestId: "r1", traceId: "tr_api", projectId },
      )) as { jobId: string; trendCount: number };
      expect(ack.jobId).toMatch(/^job_/);
      expect(ack.trendCount).toBeGreaterThan(0);

      const graph = (await handlers["growth.getKeywordGraph"]!(
        { projectId },
        { requestId: "r2", traceId: "tr_api2", projectId },
      )) as { nodes: unknown[] };
      expect(graph.nodes.length).toBeGreaterThan(0);

      const trendsRes = (await handlers["growth.getNormalizedTrends"]!(
        { projectId },
        { requestId: "r3", traceId: "tr_api3", projectId },
      )) as { trends: Array<{ id: string }> };
      const hookRes = (await handlers["growth.buildMultiJackHook"]!(
        { projectId, trendId: trendsRes.trends[0]!.id },
        { requestId: "r4", traceId: "tr_api4", projectId },
      )) as { ok: boolean; hook?: { paidApiRequired: boolean } };
      expect(hookRes.ok).toBe(true);
      expect(hookRes.hook?.paidApiRequired).toBe(false);
    } finally {
      storage.close();
    }
  });
});
