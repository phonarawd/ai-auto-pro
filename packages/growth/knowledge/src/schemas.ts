import { withSchemaVersionSchema } from "@clime/shared";
import { z } from "zod";

/** V1 Knowledge Store namespaces (RFC 11) — one store, filtered browser. */
export const KNOWLEDGE_NAMESPACES = [
  "brand",
  "growth",
  "competitor",
  "system",
  "strategy",
] as const;

export const knowledgeNamespaceSchema = z.enum(KNOWLEDGE_NAMESPACES);
export type KnowledgeNamespace = z.infer<typeof knowledgeNamespaceSchema>;

export const knowledgeItemViewSchema = withSchemaVersionSchema({
  kind: z.literal("knowledge.item"),
  id: z.string().min(1),
  projectId: z.string().min(1),
  namespace: z.string().min(1),
  type: z.string().min(1),
  tags: z.array(z.string()),
  body: z.unknown().optional(),
  blobRef: z.string().nullable().optional(),
  updatedAt: z.string().min(1),
  createdAt: z.string().min(1),
});
export type KnowledgeItemView = z.infer<typeof knowledgeItemViewSchema>;
