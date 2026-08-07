import { schemaVersionSchema } from "@clime/shared";
import { z } from "zod";

const vaultRefPattern = /^vault:[A-Za-z0-9_-]+$/;

export const configValueEnvelopeSchema = z.discriminatedUnion("kind", [
  z.object({
    schema_version: schemaVersionSchema,
    kind: z.literal("value"),
    value: z.unknown(),
  }),
  z.object({
    schema_version: schemaVersionSchema,
    kind: z.literal("ref"),
    ref: z.string().regex(vaultRefPattern, "ref must be a VaultRef"),
  }),
]);

export type ConfigValueEnvelope = z.infer<typeof configValueEnvelopeSchema>;

export const userPrefsConfigSchema = z.object({
  schema_version: schemaVersionSchema,
  values: z.record(z.string(), configValueEnvelopeSchema).default({}),
});

export type UserPrefsConfig = z.infer<typeof userPrefsConfigSchema>;
