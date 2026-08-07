import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createResearchEngine } from "@clime/growth-research";
import { createSqliteStorage } from "@clime/storage";
import { createTopicGeneratorEngine } from "./engine.js";

describe("D-D Growth MVP Prove (planning / Topic home)", () => {
  it("Topic home = @clime/growth-planning", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { name: string; dependencies?: Record<string, string> };
    expect(pkg.name).toBe("@clime/growth-planning");
    expect(existsSync(join(process.cwd(), "src", "topic-generator.ts"))).toBe(true);
    expect(pkg.dependencies?.["@clime/growth-research"]).toBe("workspace:*");
  });

  it("Mission/Decision pipe produces schema_version topic candidates", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "D-D-P" });
      const research = createResearchEngine(storage);
      await research.runResearchJob({ projectId, traceId: "tr_dd_p" });
      const planning = createTopicGeneratorEngine(research);
      const result = await planning.generateTopic({
        projectId,
        missionId: "m1",
        missionGoal: "Organic growth",
        decisionId: "d1",
        decisionSummary: "Shorts-heavy mix",
        traceId: "tr_dd_topic",
      });
      expect(result.schema_version).toBe(1);
      expect(result.kind).toBe("growth.topic_generate_result");
      expect(result.topics.every((t) => t.schema_version === 1)).toBe(true);
      expect(result.topics.every((t) => t.kind === "growth.topic_candidate")).toBe(true);
      expect(result.topics[0]?.missionId).toBe("m1");
      expect(result.topics[0]?.decisionId).toBe("d1");
    } finally {
      storage.close();
    }
  });
});
