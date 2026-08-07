import { schemaVersionSchema } from "@clime/shared";
import { z } from "zod";
import { traceIdSchema } from "./trace-id.js";

/** IPC request envelope — traceId required (S3A §3.1). */
export const tracedIpcRequestSchema = z.object({
  requestId: z.string().min(1),
  schema_version: schemaVersionSchema,
  traceId: traceIdSchema,
  projectId: z.string().nullable().optional(),
  args: z.record(z.string(), z.unknown()).default({}),
});

export type TracedIpcRequest = z.infer<typeof tracedIpcRequestSchema>;

/** IPC response envelope — traceId required on success and failure (S3A §3.2). */
export const tracedIpcResponseSchema = z.discriminatedUnion("ok", [
  z.object({
    requestId: z.string().min(1),
    ok: z.literal(true),
    traceId: traceIdSchema,
    data: z.unknown(),
  }),
  z.object({
    requestId: z.string().min(1),
    ok: z.literal(false),
    traceId: traceIdSchema,
    error: z.object({
      code: z.string().min(1),
      message: z.string(),
      retryable: z.boolean(),
      traceId: traceIdSchema,
      details: z.record(z.string(), z.unknown()).optional(),
    }),
  }),
]);

export type TracedIpcResponse = z.infer<typeof tracedIpcResponseSchema>;

/** Workflow run boundary — traceId required (05_WORKFLOW §12). */
export const tracedWorkflowRunSchema = z.object({
  schema_version: schemaVersionSchema,
  workflowRunId: z.string().min(1),
  traceId: traceIdSchema,
  projectId: z.string().nullable().optional(),
});

export type TracedWorkflowRun = z.infer<typeof tracedWorkflowRunSchema>;

/** AI adapter call boundary — traceId required (12_INFRASTRUCTURE §8). */
export const tracedAiCallSchema = z.object({
  schema_version: schemaVersionSchema,
  traceId: traceIdSchema,
  provider: z.string().min(1),
  operation: z.string().min(1),
  projectId: z.string().nullable().optional(),
});

export type TracedAiCall = z.infer<typeof tracedAiCallSchema>;

/** Governance / audit thin log — traceId required on denials and kill switch. */
export const tracedAuditEventSchema = z.object({
  schema_version: schemaVersionSchema,
  type: z.string().min(1),
  traceId: traceIdSchema,
  projectId: z.string().nullable().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export type TracedAuditEvent = z.infer<typeof tracedAuditEventSchema>;
