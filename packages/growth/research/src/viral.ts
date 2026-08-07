import type { NormalizedTrend, ViralSignal } from "./schemas.js";

/**
 * Viral signal analysis — GA §7 / g-c.
 * Analysis only — not PDF (vg-b), not .clime (vg-d), not 7-channel (c1-b).
 */
export function buildViralSignal(input: {
  projectId: string;
  trends: NormalizedTrend[];
  now?: string;
}): ViralSignal {
  const createdAt = input.now ?? new Date().toISOString();
  const ranked = [...input.trends]
    .sort((a, b) => b.unifiedScore - a.unifiedScore)
    .slice(0, 5);

  const signals =
    ranked.length > 0
      ? ranked.map((t, i) => ({
          id: `viral_${t.id || i}`,
          topic: t.title,
          viralityScore: Number(
            Math.min(1, t.unifiedScore * 0.7 + (t.formatTips.includes("shorts") ? 0.15 : 0) + 0.1).toFixed(
              3,
            ),
          ),
          hooks: [
            `${t.query || t.title} — 지금 왜?`,
            `30초만에 보는 ${t.title}`,
          ],
          formatTips:
            t.formatTips.length > 0 ? t.formatTips : ["shorts", "threads", "meme"],
        }))
      : [
          {
            id: "viral_seed_1",
            topic: "CLIME Growth loop explainability",
            viralityScore: 0.42,
            hooks: ["START → Queue → Validate → 게시", "Capability가 정직한 이유가 콘텐츠"],
            formatTips: ["threads", "card_news", "shorts"],
          },
        ];

  return {
    schema_version: 1,
    kind: "growth.viral_signal",
    id: `viral_${input.projectId}_${createdAt.slice(0, 10)}`,
    projectId: input.projectId,
    signals,
    paidApiRequired: false,
    createdAt,
  };
}
