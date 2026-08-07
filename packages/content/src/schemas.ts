import {
  publishingHistoryKindSchema,
  schemaVersionSchema,
  withSchemaVersionSchema,
} from "@clime/shared";
import { z } from "zod";
import { REPURPOSE_CHANNEL_IDS } from "./channels.js";

export const contentLifecycleStatusSchema = z.enum([
  "draft",
  "validated",
  "optimized",
  "ready",
  "failed_validation",
]);
export type ContentLifecycleStatus = z.infer<typeof contentLifecycleStatusSchema>;

export const validationCheckResultSchema = z.enum(["pass", "fail", "skip"]);

export const artifactValidationSchema = z.object({
  passed: z.boolean(),
  checkedAt: z.string().min(1),
  errors: z.array(z.string()),
  checks: z.record(z.string(), validationCheckResultSchema),
});
export type ArtifactValidation = z.infer<typeof artifactValidationSchema>;

export const contentArtifactMetaSchema = withSchemaVersionSchema({
  kind: z.literal("content.artifact"),
  title: z.string().optional(),
  body: z.string(),
  prompt: z.string().optional(),
  hooks: z.array(z.string()).optional(),
  hashtags: z.array(z.string()).optional(),
  sourceContentItemId: z.string().optional(),
  packId: z.string().optional(),
  validation: artifactValidationSchema.optional(),
});
export type ContentArtifactMeta = z.infer<typeof contentArtifactMetaSchema>;

export const exportAccountsSchema = withSchemaVersionSchema({
  kind: z.literal("content.export_accounts"),
  accounts: z.array(
    z.object({
      contentItemId: z.string().min(1),
      channel: z.string().min(1),
      targetAccountId: z.string().nullable(),
      file: z.string().min(1),
    }),
  ),
});
export type ExportAccounts = z.infer<typeof exportAccountsSchema>;

export const exportManifestSchema = withSchemaVersionSchema({
  kind: z.literal("content.export_backup"),
  exportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  projectId: z.string().min(1),
  contentItemIds: z.array(z.string().min(1)),
  files: z.array(z.string().min(1)),
  packId: z.string().optional(),
  createdAt: z.string().min(1),
});
export type ExportManifest = z.infer<typeof exportManifestSchema>;

export const repurposeChannelIdSchema = z.enum(REPURPOSE_CHANNEL_IDS);

/** Re-export frozen history kinds — Content must not widen. */
export { publishingHistoryKindSchema, schemaVersionSchema };

export const CONTENT_ERROR_CODES = {
  VALIDATE_REQUIRED: "VALIDATE_REQUIRED",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  INVALID_HISTORY_KIND: "INVALID_HISTORY_KIND",
  EXPORT_CLIME_FORBIDDEN: "EXPORT_CLIME_FORBIDDEN",
  INVALID_ARTIFACT: "INVALID_ARTIFACT",
} as const;

export type ContentErrorCode =
  (typeof CONTENT_ERROR_CODES)[keyof typeof CONTENT_ERROR_CODES];
