import type { KeywordGraph, NormalizedTrend, ResearcherReport } from "./schemas.js";

function slugId(prefix: string, seed: string): string {
  const safe = seed
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gi, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
  return `${prefix}_${safe || "item"}`;
}

/**
 * AI Researcher — GA §2 / g-b.
 * Deterministic pattern extraction from trends + keyword graph (no paid API).
 */
export function buildResearcherReport(input: {
  projectId: string;
  trends: NormalizedTrend[];
  graph: KeywordGraph;
  now?: string;
}): ResearcherReport {
  const createdAt = input.now ?? new Date().toISOString();
  const top = [...input.trends]
    .sort((a, b) => b.unifiedScore - a.unifiedScore)
    .slice(0, 5);

  const patterns = top.map((t, i) => ({
    id: slugId("pat", t.id || `t${i}`),
    title: t.title,
    hook: `왜 지금 ${t.query || t.title}?`,
    formatTips: t.formatTips.length > 0 ? t.formatTips : ["shorts", "threads"],
    evidence: [
      `unifiedScore=${t.unifiedScore.toFixed(2)}`,
      `climeFit=${t.climeFit.toFixed(2)}`,
      `source=${t.sourceId}`,
      ...(t.keywords.slice(0, 3).map((k) => `kw:${k}`)),
    ],
  }));

  if (patterns.length === 0 && input.graph.nodes.length > 0) {
    const node = input.graph.nodes[0]!;
    patterns.push({
      id: slugId("pat", node.id),
      title: node.label,
      hook: `${node.label} — CLIME 성장 각도`,
      formatTips: ["card_news", "threads"],
      evidence: [`keyword_type=${node.type}`, `graph_nodes=${input.graph.nodes.length}`],
    });
  }

  const brandSafeVariants = patterns.flatMap((p) => [
    `[CLIME] ${p.title} — 운영 루프로 설명`,
    `검증 먼저: ${p.hook ?? p.title}`,
  ]);

  return {
    schema_version: 1,
    kind: "growth.researcher_report",
    id: `researcher_${input.projectId}_${createdAt.slice(0, 10)}`,
    projectId: input.projectId,
    patterns,
    brandSafeVariants: brandSafeVariants.slice(0, 8),
    feedsDecision: true,
    paidApiRequired: false,
    createdAt,
  };
}
