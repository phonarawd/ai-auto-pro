import { z } from "zod";
import { randomUUID } from "node:crypto";

/** Non-empty trace identifier — observability primary key (S3A §3.1). */
export const traceIdSchema = z.string().min(1);

export type TraceId = z.infer<typeof traceIdSchema>;

/** Generate a new root trace id (UI action origin or host fallback). */
export function createTraceId(): TraceId {
  return `tr_${randomUUID()}`;
}

/** Parse unknown input as a trace id at package boundaries. */
export function parseTraceId(input: unknown): TraceId {
  return traceIdSchema.parse(input);
}
