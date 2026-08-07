/**
 * V1-B Constitution / Architecture Prove —
 * 5 locks · UI→IPC→Domain · Adapter only · Growth umbrella · Prisma/Supabase 0
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, taskStateSchema } from "@clime/shared";
import {
  canTransition,
  checkTransition,
  createDailyGrowthDsl,
} from "@clime/workflow";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");

const FORBIDDEN_DEPS = new Set([
  "prisma",
  "@prisma/client",
  "@supabase/supabase-js",
  "@supabase/ssr",
  "postgres",
  "pg",
]);

const VENDOR_SDK_IMPORT =
  /from\s+["'](openai|@anthropic-ai\/sdk|@google\/generative-ai|@google\/genai)["']/;

function walkFiles(
  dir: string,
  pred: (name: string) => boolean,
  out: string[] = [],
): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (
      name === "node_modules" ||
      name === "dist" ||
      name === ".turbo" ||
      name === "release" ||
      name === "__eslint_fixtures__"
    ) {
      continue;
    }
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkFiles(p, pred, out);
    else if (pred(name)) out.push(p);
  }
  return out;
}

function collectPackageJsonDeps(): string[] {
  const pkgs = walkFiles(repoRoot, (n) => n === "package.json");
  const names: string[] = [];
  for (const p of pkgs) {
    if (p.includes(`${join("node_modules")}`)) continue;
    const json = JSON.parse(readFileSync(p, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    for (const dep of Object.keys({
      ...json.dependencies,
      ...json.devDependencies,
    })) {
      names.push(dep);
    }
  }
  return names;
}

describe("V1-B Constitution / Architecture Prove", () => {
  it("Task SM happy path + Validate-skip = 0", () => {
    expect(canTransition("QUEUED", "RUNNING")).toBe(true);
    expect(canTransition("RUNNING", "VALIDATING")).toBe(true);
    expect(canTransition("VALIDATING", "OPTIMIZING")).toBe(true);
    expect(canTransition("OPTIMIZING", "READY")).toBe(true);
    expect(canTransition("READY", "PUBLISHED")).toBe(true);
    expect(canTransition("RUNNING", "OPTIMIZING")).toBe(false);
    expect(checkTransition("RUNNING", "PUBLISHED").ok).toBe(false);
    expect(taskStateSchema.safeParse("PAUSED_CHALLENGE").success).toBe(true);
    expect(taskStateSchema.safeParse("BLOCKED_CAPABILITY").success).toBe(true);
  });

  it("Schema versioning at IPC + DSL boundaries", () => {
    expect(SCHEMA_VERSION).toBe(1);
    const dsl = createDailyGrowthDsl();
    expect(dsl.schema_version).toBe(SCHEMA_VERSION);

    const envelope = readFileSync(
      join(repoRoot, "packages/domain-api/src/ipc/envelope.ts"),
      "utf8",
    );
    expect(envelope).toMatch(/schema_version/);
  });

  it("Plugin Manifest contract exists; connectors README Manifest-only", () => {
    expect(
      existsSync(join(repoRoot, "packages/plugin-sdk/src/manifest.ts")),
    ).toBe(true);
    const readme = readFileSync(
      join(repoRoot, "plugins/connectors/README.md"),
      "utf8",
    );
    expect(readme.toLowerCase()).toMatch(/manifest/);
  });

  it("AI vendor SDKs absent from product TypeScript; Adapter package has no vendor deps", () => {
    const aiPkg = JSON.parse(
      readFileSync(join(repoRoot, "packages/ai/package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };
    const aiDeps = Object.keys(aiPkg.dependencies ?? {});
    expect(aiDeps).not.toContain("openai");
    expect(aiDeps.some((d) => d.startsWith("@anthropic"))).toBe(false);
    expect(aiDeps.some((d) => d.startsWith("@google"))).toBe(false);

    const tsFiles = [
      ...walkFiles(join(repoRoot, "packages"), (n) =>
        /\.(ts|tsx)$/.test(n) && !n.endsWith(".test.ts") && !n.endsWith(".test.tsx"),
      ),
      ...walkFiles(join(repoRoot, "apps"), (n) =>
        /\.(ts|tsx)$/.test(n) && !n.endsWith(".test.ts") && !n.endsWith(".test.tsx"),
      ),
    ];
    for (const f of tsFiles) {
      const src = readFileSync(f, "utf8");
      expect(src, relative(repoRoot, f)).not.toMatch(VENDOR_SDK_IMPORT);
    }
  });

  it("Everything is a Workflow — Daily Growth includes Learn node", () => {
    const dsl = createDailyGrowthDsl();
    expect(dsl.nodes.some((n) => n.type === "learning.propose_from_roi")).toBe(
      true,
    );
    expect(dsl.nodes.some((n) => n.type === "account.publish")).toBe(true);
    expect(dsl.nodes.some((n) => n.type === "content.validate")).toBe(true);
  });

  it("ESLint forbids all five growth packages from renderer", () => {
    const eslint = readFileSync(join(repoRoot, "eslint.config.js"), "utf8");
    for (const pkg of [
      "growth-research",
      "growth-planning",
      "growth-decision",
      "growth-revenue",
      "growth-knowledge",
    ]) {
      expect(eslint).toContain(`"@clime/${pkg}"`);
      expect(eslint).toContain(`"@clime/${pkg}/*"`);
    }
  });

  it("Preload exposes Domain client only", () => {
    const preload = readFileSync(
      join(repoRoot, "apps/desktop/src/preload/index.ts"),
      "utf8",
    );
    expect(preload).toMatch(/domainClient|contextBridge/);
    expect(preload).not.toMatch(/from\s+["']@clime\/storage["']/);
    expect(preload).not.toMatch(/from\s+["']drizzle-orm["']/);
  });

  it("Prisma / Supabase / Postgres client deps = 0", () => {
    const deps = collectPackageJsonDeps();
    for (const forbidden of FORBIDDEN_DEPS) {
      expect(deps, forbidden).not.toContain(forbidden);
    }
  });

  it("Drizzle imports only under packages/storage", () => {
    const tsFiles = walkFiles(join(repoRoot, "packages"), (n) =>
      /\.(ts|tsx)$/.test(n),
    );
    for (const f of tsFiles) {
      if (f.includes(`${join("packages", "storage")}`)) continue;
      const src = readFileSync(f, "utf8");
      expect(src, relative(repoRoot, f)).not.toMatch(
        /from\s+["']drizzle-orm["']/,
      );
      expect(src, relative(repoRoot, f)).not.toMatch(
        /from\s+["']better-sqlite3["']/,
      );
    }
  });

  it("Growth umbrella exactly five; Topic∈planning; Brand∈research", () => {
    const growthRoot = join(repoRoot, "packages", "growth");
    const dirs = readdirSync(growthRoot).filter((n) =>
      statSync(join(growthRoot, n)).isDirectory(),
    );
    expect(dirs.sort()).toEqual(
      ["decision", "knowledge", "planning", "research", "revenue"].sort(),
    );
    expect(
      existsSync(join(growthRoot, "planning/src/topic-generator.ts")),
    ).toBe(true);
    expect(existsSync(join(growthRoot, "research/src/brand.ts"))).toBe(true);
  });
});
