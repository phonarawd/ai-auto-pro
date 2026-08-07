import { AsyncLocalStorage } from "node:async_hooks";
import type { TraceId } from "./trace-id.js";

const traceContext = new AsyncLocalStorage<TraceId>();

/** Read the trace id bound to the current async execution context. */
export function getActiveTraceId(): TraceId | undefined {
  return traceContext.getStore();
}

/** Run fn with traceId propagated through async hops (workers, adapters, IPC host). */
export async function runWithTraceId<T>(
  traceId: TraceId,
  fn: () => T | Promise<T>,
): Promise<T> {
  return traceContext.run(traceId, fn);
}
