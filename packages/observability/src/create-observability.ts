import { MissingTraceIdError } from "./errors.js";
import type { TraceMandatoryPath } from "./mandatory-paths.js";
import { requireTraceId as requireTraceIdOnPath, resolveTraceId } from "./require-trace.js";
import { createTraceId, parseTraceId, type TraceId } from "./trace-id.js";
import { getActiveTraceId, runWithTraceId } from "./trace-context.js";

export type TraceRecordInput = {
  traceId: string;
  channel: string;
  requestId?: string;
  ok: boolean;
  path?: TraceMandatoryPath;
  durationMs?: number;
  errorCode?: string;
};

export type ObservabilitySink = (record: TraceRecordInput) => void;

export type Observability = {
  createTraceId: () => TraceId;
  getActiveTraceId: () => TraceId | undefined;
  runWithTraceId: <T>(traceId: TraceId, fn: () => T | Promise<T>) => Promise<T>;
  requireTraceId: (path: TraceMandatoryPath, input: { traceId?: string | null }) => TraceId;
  record: (input: TraceRecordInput) => void;
  /** Test helper — in-memory records when no external sink is configured. */
  getRecords: () => readonly TraceRecordInput[];
};

export type CreateObservabilityOptions = {
  sink?: ObservabilitySink;
};

/**
 * Factory for trace propagation + thin IPC/workflow recording (S3A handler pipeline step 8).
 * Full metrics export and file sinks defer to later slices.
 */
export function createObservability(options: CreateObservabilityOptions = {}): Observability {
  const records: TraceRecordInput[] = [];
  const sink = options.sink;

  return {
    createTraceId,
    getActiveTraceId,
    runWithTraceId,
    requireTraceId: requireTraceIdOnPath,
    record(input) {
      const traceId = resolveTraceId(
        input.path ?? "ipc",
        input,
        getActiveTraceId(),
      );

      const normalized: TraceRecordInput = {
        ...input,
        traceId: parseTraceId(traceId),
      };

      if (sink) {
        sink(normalized);
      } else {
        records.push(normalized);
      }
    },
    getRecords() {
      return records;
    },
  };
}

export { MissingTraceIdError };
