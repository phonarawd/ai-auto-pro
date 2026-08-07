/**
 * Public constants that do not pull Drizzle table objects into the engine import graph.
 */
export {
  SCHEMA_VERSION,
  withSchemaVersion,
  parseWithSchemaVersion,
  jsonDocumentEnvelopeSchema,
} from "./zod/index.js";

/** Normative first-class table count (s2-a §2). */
export const FIRST_CLASS_TABLE_COUNT = 25 as const;
