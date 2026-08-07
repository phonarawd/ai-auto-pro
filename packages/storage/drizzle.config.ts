import { defineConfig } from "drizzle-kit";

/** Drizzle Kit config — day-one migrations live under ./drizzle (s2-a §7). */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "sqlite",
  strict: true,
});
