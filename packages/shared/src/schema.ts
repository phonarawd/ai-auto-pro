import { z } from "zod";

/** Default schema_version for Workflow / Knowledge / Export / Event JSON envelopes. */
export const SCHEMA_VERSION = 1 as const;

export type SchemaVersion = typeof SCHEMA_VERSION;

export type WithSchemaVersion<T extends Record<string, unknown>> = T & {
  schema_version: SchemaVersion;
};

/** Zod literal for constitutional schema_version at JSON boundaries. */
export const schemaVersionSchema = z.literal(SCHEMA_VERSION);

/**
 * Attach constitutional `schema_version` at JSON boundaries.
 * Prefer this (or parseWithSchemaVersion) over ad-hoc spreads in Storage/Domain API.
 */
export function withSchemaVersion<T extends Record<string, unknown>>(
  payload: T,
  version: SchemaVersion = SCHEMA_VERSION,
): WithSchemaVersion<T> {
  return { schema_version: version, ...payload };
}

/** Wrap a Zod object schema so `schema_version` is required on the envelope. */
export function withSchemaVersionSchema<T extends z.ZodRawShape>(shape: T) {
  return z.object({ schema_version: schemaVersionSchema, ...shape });
}

/**
 * Parse unknown JSON at a package boundary; rejects missing/unknown schema_version.
 */
export function parseWithSchemaVersion<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown,
): z.infer<T> {
  return schema.parse(input);
}

/** Capability Matrix — publishMode (API/UI/DB must match). */
export const publishModeSchema = z.enum(["api", "session"]);
export type PublishMode = z.infer<typeof publishModeSchema>;

/** Capability Matrix — riskLevel. */
export const riskLevelSchema = z.enum(["low", "medium", "high"]);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

/** PublishingHistoryEvent.kind — fixed enum. */
export const publishingHistoryKindSchema = z.enum([
  "draft",
  "export",
  "scheduled",
  "posted_manual",
  "posted_api",
  "posted_session",
]);
export type PublishingHistoryKind = z.infer<typeof publishingHistoryKindSchema>;

/** WorkflowRun Task SM — happy path + terminals (05_WORKFLOW). */
export const taskStateSchema = z.enum([
  "QUEUED",
  "RUNNING",
  "VALIDATING",
  "OPTIMIZING",
  "READY",
  "PUBLISHED",
  "FAILED",
  "CANCELLED",
  "BLOCKED_HUMAN",
  "BLOCKED_CAPABILITY",
  "BLOCKED_POLICY",
  "PAUSED_CHALLENGE",
]);
export type TaskState = z.infer<typeof taskStateSchema>;

export const featureLifecycleSchema = z.enum([
  "enabled",
  "disabled",
  "experimental",
  "beta",
  "hidden",
]);
export type FeatureLifecycle = z.infer<typeof featureLifecycleSchema>;

export const settingsScopeSchema = z.enum(["global", "project", "user"]);
export type SettingsScope = z.infer<typeof settingsScopeSchema>;

export const goalHorizonSchema = z.enum(["week", "month", "quarter"]);
export type GoalHorizon = z.infer<typeof goalHorizonSchema>;

/** Minimum event/outbox-style envelope used at Storage boundaries. */
export const boundaryEnvelopeSchema = withSchemaVersionSchema({
  type: z.string().min(1),
  traceId: z.string().min(1).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});
export type BoundaryEnvelope = z.infer<typeof boundaryEnvelopeSchema>;
