import { createHash, randomUUID } from "node:crypto";
import type { KeywordGraph, NormalizedTrend } from "@clime/growth-research";
import type { TopicCandidate } from "./schemas.js";
import { topicCandidateSchema } from "./schemas.js";

export type MissionDecisionPipeInput = {
  projectId: string;
  missionId?: string | null;
  missionGoal?: string | null;
  decisionId?: string | null;
  decisionSummary?: string | null;
  /** Research grounding */
  keywordGraph: KeywordGraph;
  trends: NormalizedTrend[];
  /** Optional preferred trend ids */
  trendIds?: string[];
  maxTopics?: number;
  traceId: string;
};

function topicId(seed: string): string {
  return `topic_${createHash("sha256").update(seed).digest("hex").slice(0, 12)}`;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Topic Generator — package home `growth/planning` (DA §6).
 * Reads Mission/Decision context + research Keyword/Trend inputs.
 * Does NOT emit daily Mission priority (Decision Engine owns that).
 */
export function generateTopicsFromPipe(input: MissionDecisionPipeInput): TopicCandidate[] {
  const max = Math.max(1, Math.min(input.maxTopics ?? 5, 12));
  const createdAt = new Date().toISOString();
  const missionGoal = (input.missionGoal ?? "").trim();
  const decisionSummary = (input.decisionSummary ?? "").trim();

  const selectedTrends =
    input.trendIds && input.trendIds.length > 0
      ? input.trends.filter((t) => input.trendIds!.includes(t.id))
      : input.trends;

  const pool =
    selectedTrends.length > 0
      ? selectedTrends
      : input.keywordGraph.nodes.slice(0, 5).map(
          (n): NormalizedTrend => ({
            schema_version: 1,
            kind: "growth.normalized_trend",
            id: `synthetic_${n.id}`,
            title: n.label,
            query: n.label,
            sourceId: "keyword_graph",
            unifiedScore: n.score ?? 0.5,
            climeFit: n.score ?? 0.5,
            formatTips: ["threads"],
            keywords: [n.label],
            normalizedAt: createdAt,
          }),
        );

  if (pool.length === 0) {
    // Still produce one grounded stub so Mission pipe is usable empty-state
    const primary = missionGoal || "CLIME growth content";
    return [
      topicCandidateSchema.parse({
        schema_version: 1,
        kind: "growth.topic_candidate",
        id: topicId(`${input.projectId}:${primary}:${randomUUID()}`),
        title: primary,
        angle: decisionSummary || "Mission-grounded baseline topic",
        primaryKeyword: primary,
        supportingKeywords: [],
        sourceTrendIds: [],
        missionId: input.missionId ?? null,
        decisionId: input.decisionId ?? null,
        score: 0.4,
        createdAt,
      }),
    ];
  }

  const topics: TopicCandidate[] = [];
  for (const trend of pool.slice(0, max)) {
    const supporting = trend.keywords.filter(
      (k) => k.toLowerCase() !== trend.query.toLowerCase(),
    );
    const angleParts = [
      missionGoal ? `Mission: ${missionGoal}` : null,
      decisionSummary ? `Decision: ${decisionSummary}` : null,
      `Trend fit ${trend.climeFit.toFixed(2)}`,
    ].filter(Boolean);

    const titleBase = missionGoal
      ? `${trend.title} for ${missionGoal}`
      : trend.title;

    const score = clamp01(
      trend.unifiedScore * 0.55 +
        trend.climeFit * 0.35 +
        (missionGoal ? 0.05 : 0) +
        (decisionSummary ? 0.05 : 0),
    );

    topics.push(
      topicCandidateSchema.parse({
        schema_version: 1,
        kind: "growth.topic_candidate",
        id: topicId(`${input.projectId}:${trend.id}:${titleBase}`),
        title: titleBase.slice(0, 160),
        angle: angleParts.join(" · ") || "Research-grounded topic",
        primaryKeyword: trend.query,
        supportingKeywords: supporting.slice(0, 6),
        sourceTrendIds: [trend.id],
        missionId: input.missionId ?? null,
        decisionId: input.decisionId ?? null,
        score,
        createdAt,
      }),
    );
  }

  return topics.sort((a, b) => b.score - a.score);
}
