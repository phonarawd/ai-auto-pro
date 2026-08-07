import { withSchemaVersionSchema } from "@clime/shared";
import { z } from "zod";

export const LEARNING_KNOWLEDGE = {
  reflectionNamespace: "learning",
  reflectionType: "reflection",
  strategyNamespace: "strategy",
  playbookType: "playbook",
} as const;

export const learningPolicyStatusSchema = z.enum([
  "suggested",
  "active",
  "rejected",
]);
export type LearningPolicyStatus = z.infer<typeof learningPolicyStatusSchema>;

export const proposalSourceSchema = z.enum([
  "roi",
  "reflection",
  "experiment",
  "manual",
]);
export type ProposalSource = z.infer<typeof proposalSourceSchema>;

export const learningPolicyDocSchema = withSchemaVersionSchema({
  kind: z.literal("learning.policy"),
  id: z.string().min(1),
  projectId: z.string().min(1),
  title: z.string().min(1),
  proposalSource: proposalSourceSchema,
  recommendation: z.string().min(1),
  proposedRule: z
    .object({
      featureKey: z.string().optional(),
      scope: z.enum(["global", "project", "user"]),
      scopeId: z.string().nullable().optional(),
      ruleHint: z.record(z.string(), z.unknown()),
    })
    .optional(),
  roiSnapshotId: z.string().optional(),
  reflectionId: z.string().optional(),
  strategyPlaybookId: z.string().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  traceId: z.string().optional(),
});
export type LearningPolicyDoc = z.infer<typeof learningPolicyDocSchema>;

export const roiSnapshotSchema = withSchemaVersionSchema({
  kind: z.literal("learning.roi_snapshot"),
  id: z.string().min(1),
  projectId: z.string().min(1),
  measuredRoi: z.number(),
  baselineRoi: z.number().optional(),
  formatHint: z.string().optional(),
  channelHint: z.string().optional(),
  sampleSize: z.number().int().nonnegative().optional(),
  isEstimate: z.boolean(),
  estimateLabel: z.literal("추정").optional(),
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1),
  measuredAt: z.string().min(1),
  traceId: z.string().optional(),
});
export type RoiSnapshot = z.infer<typeof roiSnapshotSchema>;

export const reflectionDocSchema = withSchemaVersionSchema({
  kind: z.literal("learning.reflection"),
  id: z.string().min(1),
  projectId: z.string().min(1),
  title: z.string().min(1),
  postmortem: z.string().min(1),
  confidence: z.number().min(0).max(1),
  proposalId: z.string().optional(),
  createdAt: z.string().min(1),
  traceId: z.string().optional(),
});
export type ReflectionDoc = z.infer<typeof reflectionDocSchema>;

export const strategyPlaybookSchema = withSchemaVersionSchema({
  kind: z.literal("knowledge.strategy_playbook"),
  id: z.string().min(1),
  projectId: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  sourcePolicyId: z.string().min(1),
  confidence: z.number().min(0).max(1),
  createdAt: z.string().min(1),
});
export type StrategyPlaybook = z.infer<typeof strategyPlaybookSchema>;

export const proposeFromRoiResultSchema = withSchemaVersionSchema({
  kind: z.literal("learning.propose_from_roi_result"),
  ok: z.boolean(),
  policyId: z.string().optional(),
  status: learningPolicyStatusSchema.optional(),
  autoPromoted: z.boolean(),
  episodeId: z.string().optional(),
  strategyPlaybookId: z.string().optional(),
  confidence: z.number().optional(),
  threshold: z.number(),
  message: z.string().optional(),
  traceId: z.string().optional(),
});
export type ProposeFromRoiResult = z.infer<typeof proposeFromRoiResultSchema>;
