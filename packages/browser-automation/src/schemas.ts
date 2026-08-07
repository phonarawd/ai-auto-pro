import { schemaVersionSchema, withSchemaVersionSchema } from "@clime/shared";
import { z } from "zod";

export const publishModeSchema = z.enum(["api", "session"]);
export type PublishMode = z.infer<typeof publishModeSchema>;

export const publishErrorCodeSchema = z.enum([
  "BLOCKED_CAPABILITY",
  "VALIDATE_REQUIRED",
  "DAILY_QUOTA_EXCEEDED",
  "PAUSED_CHALLENGE",
  "NOT_FOUND",
  "PUBLISH_FAILED",
]);
export type PublishErrorCode = z.infer<typeof publishErrorCodeSchema>;

export const publishTerminalSchema = z.enum([
  "BLOCKED_CAPABILITY",
  "PAUSED_CHALLENGE",
  "FAILED",
]);
export type PublishTerminal = z.infer<typeof publishTerminalSchema>;

export const publishSuccessSchema = withSchemaVersionSchema({
  ok: z.literal(true),
  publishMode: publishModeSchema,
  historyKind: z.enum(["posted_api", "posted_session"]),
  externalPostId: z.string().min(1),
  traceId: z.string().min(1),
  jitterMsApplied: z.number().int().nonnegative().optional(),
  sandboxId: z.string().optional(),
});
export type PublishSuccess = z.infer<typeof publishSuccessSchema>;

export const publishFailureSchema = withSchemaVersionSchema({
  ok: z.literal(false),
  code: publishErrorCodeSchema,
  terminal: publishTerminalSchema.optional(),
  message: z.string().min(1),
  traceId: z.string().min(1),
});
export type PublishFailure = z.infer<typeof publishFailureSchema>;

export type PublishResult = PublishSuccess | PublishFailure;

export const PUBLISH_ERROR_CODES = {
  BLOCKED_CAPABILITY: "BLOCKED_CAPABILITY",
  VALIDATE_REQUIRED: "VALIDATE_REQUIRED",
  DAILY_QUOTA_EXCEEDED: "DAILY_QUOTA_EXCEEDED",
  PAUSED_CHALLENGE: "PAUSED_CHALLENGE",
  NOT_FOUND: "NOT_FOUND",
  PUBLISH_FAILED: "PUBLISH_FAILED",
} as const;

/** Inclusive jitter bounds (ms) — x-a §2 / C2A §3.1 */
export const JITTER_MIN_MS = 5_000;
export const JITTER_MAX_MS = 45_000;

/** Default successful publishes per account per UTC day */
export const DEFAULT_DAILY_PUBLISH_QUOTA = 20;

export { schemaVersionSchema };
