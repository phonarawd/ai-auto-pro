import { createHash } from "node:crypto";
import type { NormalizedTrend, TrendRawBatch } from "./schemas.js";

const CLIME_FIT_TERMS = [
  "ai",
  "llm",
  "자동화",
  "automation",
  "growth",
  "부업",
  "sidehustle",
  "creator",
  "크리에이터",
  "shorts",
  "쇼츠",
  "hook",
  "후킹",
  "ollama",
  "content",
];

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function trendId(sourceId: string, externalId: string): string {
  const h = createHash("sha256")
    .update(`${sourceId}:${externalId}`)
    .digest("hex")
    .slice(0, 12);
  return `trend_${h}`;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,/|·]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function climeFitScore(title: string, query: string, tags: string[]): number {
  const bag = new Set([...tokenize(title), ...tokenize(query), ...tags.map((t) => t.toLowerCase())]);
  let hits = 0;
  for (const term of CLIME_FIT_TERMS) {
    if (bag.has(term) || [...bag].some((t) => t.includes(term))) hits += 1;
  }
  return clamp01(0.35 + hits * 0.12);
}

function formatTipsFor(title: string, tags: string[]): string[] {
  const tips = new Set<string>(["threads", "card_news"]);
  const blob = `${title} ${tags.join(" ")}`.toLowerCase();
  if (blob.includes("short") || blob.includes("쇼츠") || blob.includes("reel")) {
    tips.add("shorts");
  } else {
    tips.add("meme");
  }
  if (blob.includes("hook") || blob.includes("후킹")) tips.add("shorts");
  return [...tips];
}

/** Deterministic Trend Normalizer — no paid APIs (DA §3). */
export function normalizeTrendBatch(batch: TrendRawBatch): NormalizedTrend[] {
  const normalizedAt = new Date().toISOString();
  return batch.items.map((item) => {
    const query = item.query ?? item.title;
    const tags = item.tags ?? [];
    const keywords = [...new Set([...tokenize(query), ...tokenize(item.title), ...tags])];
    const unifiedScore = clamp01(item.scoreHint ?? 0.5);
    return {
      schema_version: 1 as const,
      kind: "growth.normalized_trend" as const,
      id: trendId(batch.sourceId, item.externalId),
      title: item.title,
      query,
      sourceId: batch.sourceId,
      unifiedScore,
      climeFit: climeFitScore(item.title, query, tags),
      formatTips: formatTipsFor(item.title, tags),
      keywords,
      normalizedAt,
    };
  });
}
