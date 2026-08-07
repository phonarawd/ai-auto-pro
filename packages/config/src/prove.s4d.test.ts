import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isGovernanceReservedKey } from "./forbidden-keys.js";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");

const SKIP_DIR = new Set([
  "node_modules",
  "dist",
  ".turbo",
  ".git",
  "coverage",
  ".pnpm-store",
]);

/** Patterns that must not appear as committed product fixtures (excluding docs/tests that assert rejection). */
const FORBIDDEN_FIXTURE =
  /(?:^|[^A-Za-z])(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|xox[baprs]-[a-zA-Z0-9-]{10,})/;

function walkSourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkSourceFiles(full, out);
      continue;
    }
    if (!/\.(ts|tsx|js|mjs|cjs|json)$/.test(name)) continue;
    // Allow test files that intentionally include fake secrets for rejection/heuristic tests
    if (/\.test\.(ts|tsx|js)$/.test(name)) continue;
    out.push(full);
  }
  return out;
}

describe("s4-d Secrets Prove", () => {
  it("Config reserved keys cannot act as governance", () => {
    expect(isGovernanceReservedKey("kill_switch")).toBe(true);
    expect(isGovernanceReservedKey("feature.x")).toBe(true);
    expect(isGovernanceReservedKey("ui.theme")).toBe(false);
  });

  it("no committed API-key-like fixtures in non-test package/app sources", () => {
    const roots = [join(REPO_ROOT, "packages"), join(REPO_ROOT, "apps")];
    const offenders: string[] = [];
    for (const root of roots) {
      for (const file of walkSourceFiles(root)) {
        const text = readFileSync(file, "utf8");
        if (FORBIDDEN_FIXTURE.test(text)) {
          offenders.push(relative(REPO_ROOT, file));
        }
      }
    }
    expect(offenders, offenders.join(", ")).toEqual([]);
  });

  it("packages expose vault / session / config", () => {
    const names = ["vault", "session", "config"].map((p) =>
      join(REPO_ROOT, "packages", p, "package.json"),
    );
    for (const pkg of names) {
      const json = JSON.parse(readFileSync(pkg, "utf8")) as { name: string };
      expect(json.name).toMatch(/^@clime\//);
    }
  });
});
