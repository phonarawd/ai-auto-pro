import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { ClimeSqliteDatabase } from "./client.js";

/**
 * Resolve day-one migrations folder (s2-a §1: `src/db/migrations`).
 * Works from both `src/` (vitest) and `dist/` (runtime) via package root.
 */
export function resolveMigrationsFolder(
  fromUrl: string = import.meta.url,
): string {
  const here = dirname(fileURLToPath(fromUrl));
  // …/src/db or …/dist/db → package root → src/db/migrations
  const packageRoot = join(here, "..", "..");
  return join(packageRoot, "src", "db", "migrations");
}

/** Apply Drizzle migrations (day-one = all 25 tables). */
export function migrateSqliteDatabase(
  db: ClimeSqliteDatabase,
  migrationsFolder: string = resolveMigrationsFolder(),
): void {
  migrate(db, { migrationsFolder });
}
