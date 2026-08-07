import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { schema } from "./schema.js";

export type ClimeSqliteDatabase = BetterSQLite3Database<typeof schema>;

/** V1 product defaults (s2-e-a §3). */
export const SQLITE_BUSY_TIMEOUT_MS = 5000;

export type OpenSqliteOptions = {
  /** File path, or `:memory:` for tests. */
  path: string;
  /** When true (default), enable SQLite foreign_keys PRAGMA. */
  foreignKeys?: boolean;
};

function isMemoryPath(path: string): boolean {
  return path === ":memory:" || path.startsWith("file:memdb");
}

/**
 * Internal Drizzle+SQLite bootstrap (s2-a §1 / s2-e-a §3).
 * Engines must not import this — use Repository ports from `createSqliteStorage`.
 *
 * Product file DBs: WAL + synchronous=NORMAL + busy_timeout=5000 + foreign_keys.
 * `:memory:`: foreign_keys (+ busy_timeout); WAL assertion not required.
 */
export function openSqliteDatabase(options: OpenSqliteOptions): {
  sqlite: Database.Database;
  db: ClimeSqliteDatabase;
} {
  const sqlite = new Database(options.path);

  if (!isMemoryPath(options.path)) {
    // PRAGMA journal_mode returns the mode; assign for side effect + assert path.
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("synchronous = NORMAL");
  }
  sqlite.pragma(`busy_timeout = ${SQLITE_BUSY_TIMEOUT_MS}`);

  if (options.foreignKeys !== false) {
    sqlite.pragma("foreign_keys = ON");
  }

  const db = drizzle(sqlite, { schema });
  return { sqlite, db };
}
