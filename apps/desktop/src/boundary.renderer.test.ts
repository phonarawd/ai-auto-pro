import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const desktopPkgPath = join(here, "..", "package.json");

/**
 * Desktop package: main may wire storage/workflow/automation/vault (B3 / S4).
 * Renderer must still use Domain API only — ESLint forbids engine/ORM/vault
 * imports under `src/renderer` (see boundary.eslint.test.ts).
 */
describe("desktop renderer boundary (s3-e / s5 / b3)", () => {
  it("does not depend on event-bus, session, ai, or feature-management directly", () => {
    const pkg = JSON.parse(readFileSync(desktopPkgPath, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    expect(deps["@clime/event-bus"]).toBeUndefined();
    expect(deps["@clime/session"]).toBeUndefined();
    expect(deps["@clime/ai"]).toBeUndefined();
    expect(deps["@clime/feature-management"]).toBeUndefined();
    expect(deps["drizzle-orm"]).toBeUndefined();
    expect(deps["better-sqlite3"]).toBeUndefined();

    expect(deps["@clime/domain-api"]).toBeTruthy();
    // Main-process wiring (renderer still forbidden by ESLint)
    expect(deps["@clime/automation"]).toBeTruthy();
    expect(deps["@clime/workflow"]).toBeTruthy();
    expect(deps["@clime/storage"]).toBeTruthy();
    expect(deps["@clime/vault"]).toBeTruthy();
  });
});
