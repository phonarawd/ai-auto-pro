import { SCHEMA_VERSION, schemaVersionSchema } from "@clime/shared";
import { z } from "zod";

/** Inbox item kinds — job progress, challenge pause, session, doctor (S3A §6.3). */
export const inboxItemKindSchema = z.enum([
  "job.enqueued",
  "job.progress",
  "job.terminal",
  "challenge.pause",
  "session.expired",
  "governor.throttled",
  "doctor",
  "info",
]);

export type InboxItemKind = z.infer<typeof inboxItemKindSchema>;

export const inboxSeveritySchema = z.enum(["info", "success", "warning", "danger"]);
export type InboxSeverity = z.infer<typeof inboxSeveritySchema>;

/**
 * Allowed operator actions on Inbox items.
 * Forbidden: captcha solve / bypass / stealth / spoof CTAs (constitutional).
 */
export const inboxActionKindSchema = z.enum([
  "open-inbox",
  "open-account",
  "resume-publish",
  "dismiss",
  "mark-read",
]);

export type InboxActionKind = z.infer<typeof inboxActionKindSchema>;

export const inboxActionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: inboxActionKindSchema,
});

export type InboxAction = z.infer<typeof inboxActionSchema>;

export const inboxItemSchema = z.object({
  schema_version: schemaVersionSchema,
  id: z.string().min(1),
  kind: inboxItemKindSchema,
  title: z.string().min(1),
  body: z.string(),
  severity: inboxSeveritySchema,
  read: z.boolean(),
  dismissed: z.boolean(),
  createdAt: z.string().min(1),
  traceId: z.string().optional(),
  jobId: z.string().optional(),
  accountId: z.string().optional(),
  platform: z.string().optional(),
  /** Task SM terminal when challenge/lock pauses publish. */
  terminalState: z.literal("PAUSED_CHALLENGE").optional(),
  actions: z.array(inboxActionSchema).default([]),
});

export type InboxItem = z.infer<typeof inboxItemSchema>;

export const toastPrefsSchema = z.object({
  schema_version: schemaVersionSchema,
  enabled: z.boolean(),
  soundEnabled: z.boolean().default(false),
  /** Challenge must always land in Inbox — toast-only dismiss forbidden. */
  challengeAlwaysInbox: z.literal(true),
});

export type ToastPrefs = z.infer<typeof toastPrefsSchema>;

export type EnqueueInboxInput = {
  kind: InboxItemKind;
  title: string;
  body: string;
  severity?: InboxSeverity;
  traceId?: string;
  jobId?: string;
  accountId?: string;
  platform?: string;
  terminalState?: "PAUSED_CHALLENGE";
  actions?: InboxAction[];
};

export const DEFAULT_TOAST_PREFS: ToastPrefs = {
  schema_version: SCHEMA_VERSION,
  enabled: true,
  soundEnabled: false,
  challengeAlwaysInbox: true,
};

/** Labels / copy that must never appear as CTA (bypass / captcha solve). */
export const FORBIDDEN_BYPASS_CTA_PATTERNS = [
  /captcha\s*bypass/i,
  /bypass\s*captcha/i,
  /solve\s*captcha/i,
  /우회/,
  /캡차\s*자동/,
  /자동\s*해결/,
  /stealth/i,
  /fingerprint\s*spoof/i,
] as const;
