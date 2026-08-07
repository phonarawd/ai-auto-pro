import type { MultiJackContentHook, NormalizedTrend } from "./schemas.js";
import { multiJackContentHookSchema } from "./schemas.js";

/**
 * vg-a §2 / DA §5 — Multi-Jack **content hook seed** only.
 * Does NOT generate meme/card-news/Shorts/Threads variants (vg-c).
 */
export function buildMultiJackContentHook(
  trend: NormalizedTrend,
  options?: { personaHints?: string[] },
): MultiJackContentHook {
  const hook = {
    schema_version: 1 as const,
    kind: "growth.multi_jack_content_hook" as const,
    trendId: trend.id,
    hotTopic: trend.title,
    query: trend.query,
    keywords: trend.keywords,
    formatTips: trend.formatTips,
    unifiedScore: trend.unifiedScore,
    climeFit: trend.climeFit,
    personaHints: options?.personaHints,
    paidApiRequired: false as const,
  };
  return multiJackContentHookSchema.parse(hook);
}
