/**
 * @clime/storage — public surface (s2-c).
 * Engines/UI must use Repository ports via createSqliteStorage — never import drizzle/sqlite drivers.
 */

export {
  createSqliteStorage,
  createAndSeedSqliteStorage,
  type CreateSqliteStorageOptions,
  type SqliteStorage,
} from "./repos/index.js";

export {
  seedSqliteDefaults,
  DEFAULT_FEATURES,
  EMPTY_PROJECT_NAME,
  SEED_IDS,
  SEED_MARKER_KEY,
  type SeedResult,
} from "./seed/index.js";

export type * from "./ports/index.js";

export {
  SCHEMA_VERSION,
  withSchemaVersion,
  parseWithSchemaVersion,
  jsonDocumentEnvelopeSchema,
  FIRST_CLASS_TABLE_COUNT,
} from "./public-constants.js";
