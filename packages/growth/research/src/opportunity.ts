import type {
  GapAnalysis,
  NormalizedTrend,
  OpportunityScore,
  ViralSignal,
} from "./schemas.js";

/**
 * Opportunity scoring — GA §6 / g-c.
 * Feeds Decision/Planning as inputs; never emits daily Mission priority.
 */
export function buildOpportunityScore(input: {
  projectId: string;
  trends?: NormalizedTrend[];
  gap?: GapAnalysis | null;
  viral?: ViralSignal | null;
  now?: string;
}): OpportunityScore {
  const createdAt = input.now ?? new Date().toISOString();
  const opportunities: OpportunityScore["opportunities"] = [];

  const topTrends = [...(input.trends ?? [])]
    .sort((a, b) => b.unifiedScore * b.climeFit - a.unifiedScore * a.climeFit)
    .slice(0, 4);

  for (const t of topTrends) {
    const score = Number(Math.min(1, t.unifiedScore * 0.6 + t.climeFit * 0.4).toFixed(3));
    opportunities.push({
      id: `opp_trend_${t.id}`,
      title: t.title,
      score,
      rationale: `Trend fit ${t.unifiedScore.toFixed(2)} × CLIME-fit ${t.climeFit.toFixed(2)}`,
      isEstimate: true,
      estimateLabel: "추정",
    });
  }

  for (const g of (input.gap?.gaps ?? []).slice(0, 3)) {
    opportunities.push({
      id: `opp_${g.id}`,
      title: g.label,
      score: Number(Math.min(1, g.severity + 0.05).toFixed(3)),
      rationale: g.notes,
      isEstimate: true,
      estimateLabel: "추정",
    });
  }

  for (const s of (input.viral?.signals ?? []).slice(0, 2)) {
    opportunities.push({
      id: `opp_viral_${s.id}`,
      title: `Viral angle: ${s.topic}`,
      score: s.viralityScore,
      rationale: `Hooks: ${s.hooks.slice(0, 2).join(" · ") || "n/a"}`,
      isEstimate: true,
      estimateLabel: "추정",
    });
  }

  if (opportunities.length === 0) {
    opportunities.push({
      id: "opp_seed_1",
      title: "Bootstrap research pipeline",
      score: 0.5,
      rationale: "Run research + gap/viral analysis to unlock ranked opportunities",
      isEstimate: true,
      estimateLabel: "추정",
    });
  }

  opportunities.sort((a, b) => b.score - a.score);

  return {
    schema_version: 1,
    kind: "growth.opportunity_score",
    id: `opp_${input.projectId}_${createdAt.slice(0, 10)}`,
    projectId: input.projectId,
    opportunities,
    createdAt,
  };
}
