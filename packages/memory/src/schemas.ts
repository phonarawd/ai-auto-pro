import { withSchemaVersionSchema } from "@clime/shared";
import { z } from "zod";

/** Knowledge façade for Memory episodes (JSON-until-hot — IA / RFC 11). */
export const MEMORY_KNOWLEDGE = {
  namespace: "memory",
  episodeType: "episode",
  factType: "fact",
} as const;

export const episodeKindSchema = z.enum([
  "user",
  "campaign",
  "keyword",
  "brand",
  "ai",
  "roi",
]);
export type EpisodeKind = z.infer<typeof episodeKindSchema>;

export const memoryHorizonSchema = z.enum(["short", "long", "archive"]);
export type MemoryHorizon = z.infer<typeof memoryHorizonSchema>;

export const memoryEpisodeSchema = withSchemaVersionSchema({
  kind: z.literal("memory.episode"),
  id: z.string().min(1),
  projectId: z.string().min(1),
  episodeKind: episodeKindSchema,
  horizon: memoryHorizonSchema,
  summary: z.string().min(1),
  facts: z.record(z.string(), z.unknown()),
  occurredAt: z.string().min(1),
  createdAt: z.string().min(1),
  traceId: z.string().optional(),
});
export type MemoryEpisode = z.infer<typeof memoryEpisodeSchema>;
