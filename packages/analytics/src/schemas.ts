import { withSchemaVersionSchema } from "@clime/shared";
import { z } from "zod";

/** Knowledge namespace for Experiment arm JSON (JSON-until-hot — RFC 09/14). */
export const ANALYTICS_KNOWLEDGE = {
  namespace: "analytics",
  experimentType: "experiment",
} as const;

export const experimentArmSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /** Light V1 arms: title / thumb / CTA */
  variantKind: z.enum(["control", "title", "thumb", "cta", "other"]),
  payload: z.record(z.string(), z.unknown()).optional(),
});
export type ExperimentArm = z.infer<typeof experimentArmSchema>;

export const experimentStatusSchema = z.enum([
  "draft",
  "running",
  "completed",
  "blocked_human",
]);
export type ExperimentStatus = z.infer<typeof experimentStatusSchema>;

/**
 * Experiment document — A/B skeleton.
 * spendRequested may be set; autoSpendApplied is always 0 in V1 (HumanGate seat).
 */
export const experimentDocSchema = withSchemaVersionSchema({
  kind: z.literal("analytics.experiment"),
  id: z.string().min(1),
  projectId: z.string().min(1),
  name: z.string().min(1),
  status: experimentStatusSchema,
  arms: z.array(experimentArmSchema).min(1),
  /** Requested paid spend (currency units). Null/0 = organic. */
  spendRequested: z.number().nonnegative().nullable(),
  /** Always 0 in V1 — HumanGate seat reserved; no auto spend. */
  autoSpendApplied: z.literal(0),
  humanGateRequired: z.boolean(),
  humanApproved: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  traceId: z.string().optional(),
});
export type ExperimentDoc = z.infer<typeof experimentDocSchema>;

export const createExperimentResultSchema = withSchemaVersionSchema({
  kind: z.literal("analytics.create_experiment_result"),
  ok: z.boolean(),
  experimentId: z.string().optional(),
  experiment: experimentDocSchema.optional(),
  humanGateRequired: z.boolean(),
  autoSpendApplied: z.literal(0),
  spendRequested: z.number().nonnegative().nullable(),
  terminal: z.literal("BLOCKED_HUMAN").optional(),
  message: z.string().optional(),
  traceId: z.string().optional(),
});
export type CreateExperimentResult = z.infer<typeof createExperimentResultSchema>;
