import { schemaVersionSchema } from "@clime/shared";
import { vaultRefSchema } from "@clime/vault";
import { z } from "zod";

export const sessionStatusSchema = z.enum(["active", "expired", "revoked"]);
export type SessionStatus = z.infer<typeof sessionStatusSchema>;

export const sessionExpiredReasonSchema = z.enum([
  "expired",
  "swept",
  "revoked_as_expired",
]);

export const sessionExpiredPayloadSchema = z.object({
  sessionId: z.string().min(1),
  accountId: z.string().min(1),
  reason: sessionExpiredReasonSchema,
});

export const sessionViewSchema = z.object({
  schema_version: schemaVersionSchema,
  id: z.string().min(1),
  accountId: z.string().min(1),
  status: sessionStatusSchema,
  expiresAt: z.string().nullable(),
  lastUsedAt: z.string().nullable(),
  vaultRef: vaultRefSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
