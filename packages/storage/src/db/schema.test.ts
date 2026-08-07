import { describe, expect, it } from "vitest";
import { FIRST_CLASS_TABLE_NAMES, schema } from "./schema.js";
import { openSqliteDatabase } from "./client.js";
import { migrateSqliteDatabase } from "./migrate.js";

describe("@clime/storage schema + day-one migrations", () => {
  it("exports exactly 25 first-class tables (s2-a §2)", () => {
    expect(FIRST_CLASS_TABLE_NAMES).toHaveLength(25);
    expect(Object.keys(schema)).toHaveLength(25);
    expect(new Set(FIRST_CLASS_TABLE_NAMES).size).toBe(25);
  });

  it("applies day-one migration creating all 25 tables", () => {
    const { sqlite, db } = openSqliteDatabase({ path: ":memory:" });
    try {
      migrateSqliteDatabase(db);
      const rows = sqlite
        .prepare(
          `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%' ORDER BY name`,
        )
        .all() as Array<{ name: string }>;
      const names = rows.map((r) => r.name);
      for (const table of FIRST_CLASS_TABLE_NAMES) {
        expect(names).toContain(table);
      }
      expect(
        names.filter((n) =>
          (FIRST_CLASS_TABLE_NAMES as readonly string[]).includes(n),
        ),
      ).toHaveLength(25);
    } finally {
      sqlite.close();
    }
  });

  it("enforces foreign keys after migrate", () => {
    const { sqlite, db } = openSqliteDatabase({ path: ":memory:" });
    try {
      migrateSqliteDatabase(db);
      const insertOrphan = sqlite.prepare(
        `INSERT INTO project_settings (id, project_id, key, value_json, updated_at)
         VALUES ('ps1', 'missing-project', 'k', '{"schema_version":1}', '2026-08-07T00:00:00.000Z')`,
      );
      expect(() => insertOrphan.run()).toThrow();
    } finally {
      sqlite.close();
    }
  });
});
