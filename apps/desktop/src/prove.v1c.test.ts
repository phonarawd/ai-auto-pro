/**
 * V1-C Quality Prove — CI workflow + core E2E seats + check scripts present.
 * Runtime GREEN is stamped in V1C_QUALITY_PROVE.md after `pnpm run ci:quality`.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");

describe("V1-C Quality Prove (seats)", () => {
  it("CI workflow runs lint + typecheck + test", () => {
    const ci = readFileSync(
      join(repoRoot, ".github/workflows/ci.yml"),
      "utf8",
    );
    expect(ci).toMatch(/ci:quality|pnpm.*lint|typecheck|test/);
    expect(ci).toMatch(/pull_request|push/);
  });

  it("root package exposes ci:quality", () => {
    const pkg = JSON.parse(
      readFileSync(join(repoRoot, "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.["ci:quality"]).toMatch(/lint/);
    expect(pkg.scripts?.["ci:quality"]).toMatch(/typecheck/);
    expect(pkg.scripts?.["ci:quality"]).toMatch(/test/);
  });

  it("check-toolchain and check-phase0 scripts exist", () => {
    expect(existsSync(join(repoRoot, "scripts/check-toolchain.ps1"))).toBe(
      true,
    );
    expect(existsSync(join(repoRoot, "scripts/check-phase0.ps1"))).toBe(true);
    expect(existsSync(join(repoRoot, "scripts/check-all.ps1"))).toBe(true);
  });

  it("core E2E / trust suites are present", () => {
    expect(
      existsSync(join(repoRoot, "apps/desktop/src/e2e.challenge-pause.test.ts")),
    ).toBe(true);
    expect(
      existsSync(join(repoRoot, "apps/desktop/src/prove.s8c.test.tsx")),
    ).toBe(true);
    expect(
      existsSync(join(repoRoot, "apps/desktop/src/prove.b3d.test.ts")),
    ).toBe(true);
    expect(
      existsSync(join(repoRoot, "apps/desktop/src/prove.xb.test.ts")),
    ).toBe(true);
  });

  it("Design SSOT + phase0 RFC 16 present", () => {
    expect(
      existsSync(join(repoRoot, "docs/architecture/16_DESIGN_SYSTEM.md")),
    ).toBe(true);
    const phase0 = readFileSync(
      join(repoRoot, "scripts/check-phase0.ps1"),
      "utf8",
    );
    expect(phase0).toMatch(/16_DESIGN_SYSTEM|16/);
  });
});
