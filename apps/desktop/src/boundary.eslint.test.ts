import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");
const fixturePath = join(
  here,
  "renderer",
  "__eslint_fixtures__",
  "forbidden-import.ts",
);

/**
 * Slice 5-B: boundary violation fixture must fail ESLint (no-restricted-imports).
 * Fixture is ignored in normal lint; this prove uses --no-ignore.
 */
describe("eslint renderer boundary fixture (s5-b)", () => {
  it(
    "fails lint when renderer imports vault/bus/orm/engine",
    () => {
      const result = spawnSync(
        "pnpm",
        ["exec", "eslint", "--no-ignore", fixturePath],
        {
          cwd: repoRoot,
          encoding: "utf8",
          shell: true,
          env: process.env,
        },
      );

      const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

      expect(result.status, output).not.toBe(0);
      expect(output).toMatch(/no-restricted-imports/);
      expect(output).toMatch(/@clime\/(vault|event-bus|ai|storage)|drizzle-orm/);
    },
    60000,
  );
});
