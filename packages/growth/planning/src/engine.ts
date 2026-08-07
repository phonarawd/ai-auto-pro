import type { ResearchEngine } from "@clime/growth-research";
import type { TopicGenerateResult } from "./schemas.js";
import { generateTopicsFromPipe } from "./topic-generator.js";

export type TopicGeneratorEngine = {
  generateTopic(input: {
    projectId: string;
    missionId?: string | null;
    missionGoal?: string | null;
    decisionId?: string | null;
    decisionSummary?: string | null;
    trendIds?: string[];
    maxTopics?: number;
    traceId: string;
  }): Promise<TopicGenerateResult>;
};

/**
 * Planning Topic Generator engine — depends on research read ports only (DA §9).
 */
export function createTopicGeneratorEngine(
  research: ResearchEngine,
): TopicGeneratorEngine {
  return {
    async generateTopic(input) {
      const [keywordGraph, trends] = await Promise.all([
        research.getKeywordGraph(input.projectId),
        research.getNormalizedTrends(input.projectId),
      ]);

      const topics = generateTopicsFromPipe({
        projectId: input.projectId,
        missionId: input.missionId,
        missionGoal: input.missionGoal,
        decisionId: input.decisionId,
        decisionSummary: input.decisionSummary,
        keywordGraph,
        trends,
        trendIds: input.trendIds,
        maxTopics: input.maxTopics,
        traceId: input.traceId,
      });

      return {
        schema_version: 1 as const,
        kind: "growth.topic_generate_result" as const,
        projectId: input.projectId,
        topics,
        missionId: input.missionId ?? null,
        decisionId: input.decisionId ?? null,
        traceId: input.traceId,
      };
    },
  };
}
