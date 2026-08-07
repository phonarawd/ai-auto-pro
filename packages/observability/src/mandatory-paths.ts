/**
 * Paths where traceId is constitutionally mandatory
 * (12_INFRASTRUCTURE §8 · S3A §3 · 05_WORKFLOW §12).
 */
export const TRACE_MANDATORY_PATHS = [
  "ipc",
  "workflow",
  "ai",
  "bus",
  "governance",
] as const;

export type TraceMandatoryPath = (typeof TRACE_MANDATORY_PATHS)[number];

export function isTraceMandatoryPath(value: string): value is TraceMandatoryPath {
  return (TRACE_MANDATORY_PATHS as readonly string[]).includes(value);
}
