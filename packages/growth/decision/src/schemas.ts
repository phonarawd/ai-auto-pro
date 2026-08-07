import { withSchemaVersionSchema } from "@clime/shared";
import { z } from "zod";

export const ESTIMATE_LABEL = "추정" as const;

export const decisionGraphNodeTypeSchema = z.enum([
  "Trend",
  "Keyword",
  "RevenueEstimate",
  "Decision",
  "Mission",
  "PlannerQueueItem",
]);

export const decisionGraphSchema = withSchemaVersionSchema({
  kind: z.literal("growth.decision_graph"),
  decisionId: z.string().min(1),
  decidedAt: z.string().min(1),
  productionMix: z.object({
    shorts: z.number().optional(),
    reels: z.number().optional(),
    blogs: z.number().optional(),
    threads: z.number().optional(),
  }),
  nodes: z.array(
    z.object({
      id: z.string().min(1),
      type: decisionGraphNodeTypeSchema,
      label: z.string().min(1),
    }),
  ),
  edges: z.array(
    z.object({
      from: z.string().min(1),
      to: z.string().min(1),
      relation: z.enum(["feeds", "ranks", "decides", "enqueues"]),
    }),
  ),
  narrative: z.string().min(1),
  estimateLabel: z.literal(ESTIMATE_LABEL),
});
export type DecisionGraph = z.infer<typeof decisionGraphSchema>;

export const missionTodayItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  summary: z.string().optional(),
  status: z.string().min(1),
  priority: z.number().int(),
  decisionId: z.string().nullable().optional(),
});

export const missionTodayResultSchema = z.object({
  schema_version: z.literal(1),
  missions: z.array(missionTodayItemSchema),
  decisionExplain: z.string().optional(),
  decisionId: z.string().nullable().optional(),
  queueDepth: z.number().int().nonnegative(),
  estimateLabel: z.literal(ESTIMATE_LABEL).optional(),
  productionMix: z.record(z.string(), z.number()).optional(),
});
export type MissionTodayResult = z.infer<typeof missionTodayResultSchema>;
