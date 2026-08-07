import { goalHorizonSchema, withSchemaVersionSchema } from "@clime/shared";
import { z } from "zod";

export const ESTIMATE_LABEL = "추정" as const;

export const goalStatusSchema = z.enum([
  "active",
  "paused",
  "done",
  "archived",
]);
export type GoalStatus = z.infer<typeof goalStatusSchema>;

export const kpiItemSchema = z.object({
  key: z.string().min(1),
  target: z.number(),
  unit: z.string().optional(),
  current: z.number().optional(),
});
export type KpiItem = z.infer<typeof kpiItemSchema>;

export const missionLinkSchema = z.object({
  missionId: z.string().min(1),
  title: z.string().optional(),
  linkedAt: z.string().min(1),
});
export type MissionLink = z.infer<typeof missionLinkSchema>;

/** Payload stored under Goal.kpiJson `data` (storage jsonDocumentEnvelope). */
export const goalKpiDataSchema = z.object({
  kind: z.literal("meta.goal_kpi"),
  target: z.number().optional(),
  theme: z.string().optional(),
  kpis: z.array(kpiItemSchema).default([]),
  mixCaps: z.record(z.string(), z.number()).optional(),
  missionLinks: z.array(missionLinkSchema).default([]),
  notes: z.string().optional(),
});
export type GoalKpiData = z.infer<typeof goalKpiDataSchema>;

export const goalViewSchema = withSchemaVersionSchema({
  kind: z.literal("meta.goal"),
  id: z.string().min(1),
  projectId: z.string().min(1),
  horizon: goalHorizonSchema,
  title: z.string().min(1),
  status: goalStatusSchema,
  kpi: goalKpiDataSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type GoalView = z.infer<typeof goalViewSchema>;

export const horizonStatusSchema = withSchemaVersionSchema({
  kind: z.literal("meta.horizon_status"),
  projectId: z.string().min(1),
  horizon: goalHorizonSchema,
  status: z.enum(["active", "empty", "paused"]),
  theme: z.string().optional(),
  mixCaps: z.record(z.string(), z.number()),
  goals: z.array(goalViewSchema),
  constraintHint: z.string(),
  narrative: z.string(),
});
export type HorizonStatus = z.infer<typeof horizonStatusSchema>;

export const reallocationItemSchema = z.object({
  id: z.string().min(1),
  summary: z.string().min(1),
  fromFormat: z.string().optional(),
  toFormat: z.string().optional(),
  deltaHint: z.number().optional(),
  isEstimate: z.boolean(),
  estimateLabel: z.literal(ESTIMATE_LABEL).optional(),
  rationale: z.string().min(1),
});
export type ReallocationItem = z.infer<typeof reallocationItemSchema>;

export const reallocationListSchema = withSchemaVersionSchema({
  kind: z.literal("meta.reallocation_list"),
  projectId: z.string().min(1),
  horizon: goalHorizonSchema,
  items: z.array(reallocationItemSchema),
});
export type ReallocationList = z.infer<typeof reallocationListSchema>;

export const executiveExplainSchema = withSchemaVersionSchema({
  kind: z.literal("meta.executive_explain"),
  decisionId: z.string().optional(),
  narrative: z.string(),
  graph: z
    .object({
      nodes: z.array(z.unknown()),
      edges: z.array(z.unknown()),
    })
    .nullable()
    .optional(),
  horizonNote: z.string(),
});
export type ExecutiveExplain = z.infer<typeof executiveExplainSchema>;

export const goalChainSchema = withSchemaVersionSchema({
  kind: z.literal("meta.goal_chain"),
  goal: goalViewSchema,
  kpis: z.array(kpiItemSchema),
  missionLinks: z.array(missionLinkSchema),
});
export type GoalChain = z.infer<typeof goalChainSchema>;
