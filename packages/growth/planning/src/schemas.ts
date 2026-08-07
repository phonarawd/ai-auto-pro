import { withSchemaVersionSchema } from "@clime/shared";
import { z } from "zod";

export const topicCandidateSchema = withSchemaVersionSchema({
  kind: z.literal("growth.topic_candidate"),
  id: z.string().min(1),
  title: z.string().min(1),
  angle: z.string().min(1),
  primaryKeyword: z.string().min(1),
  supportingKeywords: z.array(z.string()),
  sourceTrendIds: z.array(z.string()).optional(),
  missionId: z.string().nullable().optional(),
  decisionId: z.string().nullable().optional(),
  score: z.number().min(0).max(1),
  createdAt: z.string().min(1),
});
export type TopicCandidate = z.infer<typeof topicCandidateSchema>;

export const topicGenerateResultSchema = withSchemaVersionSchema({
  kind: z.literal("growth.topic_generate_result"),
  projectId: z.string().min(1),
  topics: z.array(topicCandidateSchema),
  missionId: z.string().nullable().optional(),
  decisionId: z.string().nullable().optional(),
  traceId: z.string().min(1),
});
export type TopicGenerateResult = z.infer<typeof topicGenerateResultSchema>;
