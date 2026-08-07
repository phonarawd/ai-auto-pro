import { randomUUID } from "node:crypto";
import {
  ASSUMPTIONS_VERSION,
  ESTIMATE_LABEL,
  type RevenueCandidate,
  type RevenueEstimate,
  type RevenuePrioritizerResult,
} from "./schemas.js";

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function formatBoost(formatHint?: string): number {
  const f = (formatHint ?? "").toLowerCase();
  if (f.includes("short") || f.includes("reel")) return 1.15;
  if (f.includes("thread")) return 1.05;
  if (f.includes("blog")) return 0.9;
  return 1;
}

/**
 * Deterministic CLIME path score: content → signup → invest → revenue/ROI.
 * Vanity volume alone does not win (EA §2.1).
 */
export function scoreCandidate(candidate: RevenueCandidate): {
  score: number;
  expectedSignups: number;
  expectedInvest: number;
  expectedRevenue: number;
  expectedRoi: number;
  confidence: number;
} {
  const fit = clamp01(candidate.climeFit ?? 0.55);
  const trend = clamp01(candidate.unifiedScore ?? 0.5);
  const boost = formatBoost(candidate.formatHint);
  const pathScore = clamp01((0.45 * fit + 0.55 * trend) * boost);

  const expectedSignups = Math.round(pathScore * 40 * 10) / 10;
  const expectedInvest = Math.round(expectedSignups * 0.12 * 10) / 10;
  const expectedRevenue = Math.round(expectedInvest * 180 * 10) / 10;
  const expectedRoi = Math.round(pathScore * 100) / 100;
  const confidence = clamp01(0.35 + 0.4 * fit + 0.15 * trend);

  return {
    score: Math.round(pathScore * 1000) / 1000,
    expectedSignups,
    expectedInvest,
    expectedRevenue,
    expectedRoi,
    confidence: Math.round(confidence * 1000) / 1000,
  };
}

export function estimateCandidate(candidate: RevenueCandidate): RevenueEstimate {
  const scored = scoreCandidate(candidate);
  return {
    schema_version: 1 as const,
    kind: "growth.revenue_estimate" as const,
    id: `est_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
    candidateId: candidate.candidateId,
    title: candidate.title,
    expectedSignups: scored.expectedSignups,
    expectedInvest: scored.expectedInvest,
    expectedRevenue: scored.expectedRevenue,
    expectedRoi: scored.expectedRoi,
    confidence: scored.confidence,
    assumptionsVersion: ASSUMPTIONS_VERSION,
    isEstimate: true as const,
    estimateLabel: ESTIMATE_LABEL,
    createdAt: new Date().toISOString(),
  };
}

export function prioritizeCandidates(
  projectId: string,
  candidates: RevenueCandidate[],
): RevenuePrioritizerResult {
  const ranked = [...candidates]
    .map((c) => {
      const scored = scoreCandidate(c);
      const estimate = estimateCandidate(c);
      return {
        candidateId: c.candidateId,
        score: scored.score,
        estimate: {
          ...estimate,
          expectedSignups: scored.expectedSignups,
          expectedInvest: scored.expectedInvest,
          expectedRevenue: scored.expectedRevenue,
          expectedRoi: scored.expectedRoi,
          confidence: scored.confidence,
        },
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((row, index) => ({
      rank: index + 1,
      candidateId: row.candidateId,
      score: row.score,
      estimate: row.estimate,
    }));

  return {
    schema_version: 1 as const,
    kind: "growth.revenue_prioritizer_result" as const,
    projectId,
    ranked,
    isEstimate: true as const,
    estimateLabel: ESTIMATE_LABEL,
    rankedAt: new Date().toISOString(),
  };
}
