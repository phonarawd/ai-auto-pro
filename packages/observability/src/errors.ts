import type { TraceMandatoryPath } from "./mandatory-paths.js";

export class MissingTraceIdError extends Error {
  readonly path: TraceMandatoryPath;

  constructor(path: TraceMandatoryPath) {
    super(`traceId is required on mandatory path: ${path}`);
    this.name = "MissingTraceIdError";
    this.path = path;
  }
}
