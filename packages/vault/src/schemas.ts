import { schemaVersionSchema } from "@clime/shared";
import { z } from "zod";

export const vaultRefSchema = z
  .string()
  .regex(/^vault:[A-Za-z0-9_-]+$/, "VaultRef must match vault:<id>");

export type VaultRef = z.infer<typeof vaultRefSchema>;

export const secretKindSchema = z.enum([
  "api_key",
  "oauth",
  "session",
  "refresh_token",
  "other",
]);

export type SecretKind = z.infer<typeof secretKindSchema>;

/** On-disk index entry — never contains plaintext. */
export const vaultIndexEntrySchema = z.object({
  schema_version: schemaVersionSchema,
  ref: vaultRefSchema,
  kind: secretKindSchema,
  meta: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  /** Relative filename of ciphertext blob under vault root. */
  blobFile: z.string().min(1),
});

export type VaultIndexEntry = z.infer<typeof vaultIndexEntrySchema>;

export const vaultIndexFileSchema = z.object({
  schema_version: schemaVersionSchema,
  entries: z.array(vaultIndexEntrySchema),
});

export type VaultIndexFile = z.infer<typeof vaultIndexFileSchema>;
