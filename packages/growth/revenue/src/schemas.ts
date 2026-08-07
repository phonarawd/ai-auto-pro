import { withSchemaVersionSchema } from "@clime/shared";
import { z } from "zod";

/** Frozen honesty labels — EA §0 / §2.2 */
export const ESTIMATE_LABEL = "추정" as const;
export const ASSUMPTIONS_VERSION = "v1_heuristic" as const;

export const revenueCandidateSchema = z.object({
  candidateId: z.string().min(1),
  title: z.string().min(1),
  formatHint: z.string().optional(),
  climeFit: z.number().min(0).max(1).optional(),
  unifiedScore: z.number().min(0).max(1).optional(),
});
export type RevenueCandidate = z.infer<typeof revenueCandidateSchema>;

export const revenueEstimateSchema = withSchemaVersionSchema({
  kind: z.literal("growth.revenue_estimate"),
  id: z.string().min(1),
  candidateId: z.string().min(1),
  title: z.string().min(1),
  expectedSignups: z.number(),
  expectedInvest: z.number(),
  expectedRevenue: z.number(),
  expectedRoi: z.number(),
  confidence: z.number().min(0).max(1),
  assumptionsVersion: z.string().min(1),
  isEstimate: z.literal(true),
  estimateLabel: z.literal(ESTIMATE_LABEL),
  createdAt: z.string().min(1),
});
export type RevenueEstimate = z.infer<typeof revenueEstimateSchema>;

export const revenuePrioritizerResultSchema = withSchemaVersionSchema({
  kind: z.literal("growth.revenue_prioritizer_result"),
  projectId: z.string().min(1),
  ranked: z.array(
    z.object({
      rank: z.number().int().positive(),
      candidateId: z.string().min(1),
      score: z.number().min(0).max(1),
      estimate: revenueEstimateSchema,
    }),
  ),
  isEstimate: z.literal(true),
  estimateLabel: z.literal(ESTIMATE_LABEL),
  rankedAt: z.string().min(1),
});
export type RevenuePrioritizerResult = z.infer<
  typeof revenuePrioritizerResultSchema
>;
