import { MissingTraceIdError } from "./errors.js";
import type { TraceMandatoryPath } from "./mandatory-paths.js";
import { parseTraceId, type TraceId } from "./trace-id.js";

type TraceCarrier = {
  traceId?: string | null | undefined;
};

/**
 * Enforce traceId on a mandatory path. Throws MissingTraceIdError when absent.
 * Domain API host, workflow workers, and AI adapters call this at boundaries.
 */
export function requireTraceId(path: TraceMandatoryPath, input: TraceCarrier): TraceId {
  const raw = input.traceId;
  if (raw === undefined || raw === null || raw === "") {
    throw new MissingTraceIdError(path);
  }
  return parseTraceId(raw);
}

/** Resolve traceId from carrier or active async context; throws when neither exists. */
export function resolveTraceId(
  path: TraceMandatoryPath,
  input: TraceCarrier,
  activeTraceId?: string | undefined,
): TraceId {
  if (input.traceId !== undefined && input.traceId !== null && input.traceId !== "") {
    return parseTraceId(input.traceId);
  }
  if (activeTraceId !== undefined && activeTraceId !== "") {
    return parseTraceId(activeTraceId);
  }
  throw new MissingTraceIdError(path);
}
