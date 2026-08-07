import type { TrendRawBatch } from "./schemas.js";

export type TrendSource = {
  id: string;
  kind: "free_public";
  fetch(projectId: string, traceId: string): Promise<TrendRawBatch>;
};

/**
 * Free public Google Trends–style fixture (no API key).
 * Simulates a public RSS/trending path for V1 MVP prove (vg-a §2 / d-b).
 */
export function createGoogleTrendsPublicSource(): TrendSource {
  return {
    id: "google_trends_public",
    kind: "free_public",
    async fetch(_projectId, _traceId) {
      const fetchedAt = new Date().toISOString();
      return {
        schema_version: 1,
        kind: "growth.trend_raw_batch",
        sourceId: "google_trends_public",
        fetchedAt,
        items: [
          {
            externalId: "gt_ai_sidehustle",
            title: "AI side hustle automation",
            query: "AI 부업 자동화",
            scoreHint: 0.92,
            tags: ["ai", "sidehustle", "automation"],
          },
          {
            externalId: "gt_shorts_hooks",
            title: "Shorts hook formulas 2026",
            query: "쇼츠 후킹 공식",
            scoreHint: 0.84,
            tags: ["shorts", "hooks", "growth"],
          },
          {
            externalId: "gt_local_llm",
            title: "Local LLM for creators",
            query: "로컬 LLM 크리에이터",
            scoreHint: 0.78,
            tags: ["ollama", "local", "creator"],
          },
        ],
      };
    },
  };
}

export function createDefaultTrendSources(): TrendSource[] {
  return [createGoogleTrendsPublicSource()];
}
