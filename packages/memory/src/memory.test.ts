import { describe, expect, it } from "vitest";
import { createSqliteStorage } from "@clime/storage";
import { createMemoryEngine } from "./engine.js";
import { MEMORY_KNOWLEDGE } from "./schemas.js";

describe("I-C memory engine", () => {
  it("records and lists episodes under Knowledge namespace=memory", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "mem" });
      const engine = createMemoryEngine(storage);
      const ep = await engine.recordEpisode({
        projectId,
        episodeKind: "roi",
        summary: "CTR 11% on Reels topic X",
        facts: { ctr: 0.11, topic: "X" },
      });
      expect(ep.schema_version).toBe(1);
      expect(ep.kind).toBe("memory.episode");

      const listed = await engine.listEpisodes(projectId);
      expect(listed).toHaveLength(1);
      expect(listed[0]?.id).toBe(ep.id);

      const rows = await storage.knowledge.list(projectId, {
        namespace: MEMORY_KNOWLEDGE.namespace,
        type: MEMORY_KNOWLEDGE.episodeType,
      });
      expect(rows).toHaveLength(1);

      const found = await engine.search(projectId, "reels");
      expect(found).toHaveLength(1);
    } finally {
      storage.close();
    }
  });

  it("does not store policies — episodes only", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "mem2" });
      const engine = createMemoryEngine(storage);
      await engine.recordEpisode({
        projectId,
        episodeKind: "campaign",
        summary: "campaign fact",
      });
      const policies = await storage.learning.list(projectId);
      expect(policies).toHaveLength(0);
    } finally {
      storage.close();
    }
  });
});
