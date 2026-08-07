import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as ai from "./index.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");

const VENDOR_SDK_PATTERNS = [
  /from\s+['"]openai['"]/,
  /from\s+['"]@anthropic-ai\//,
  /from\s+['"]@google\/generative-ai['"]/,
  /from\s+['"]@google\/genai['"]/,
  /from\s+['"]groq-sdk['"]/,
  /require\(\s*['"]openai['"]\s*\)/,
  /require\(\s*['"]@anthropic-ai\//,
];

function walkTsFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (
      name === "node_modules" ||
      name === "dist" ||
      name === ".turbo" ||
      name === ".git"
    ) {
      continue;
    }
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      walkTsFiles(p, out);
    } else if (name.endsWith(".ts") || name.endsWith(".tsx")) {
      out.push(p);
    }
  }
  return out;
}

describe("s4.5-c AI Prove", () => {
  it("exports AIEngine + Cost Intelligence from @clime/ai (not meta)", () => {
    expect(typeof ai.createAIEngine).toBe("function");
    expect(typeof ai.createCostIntelligence).toBe("function");
    expect(typeof ai.createFakeCloudAdapter).toBe("function");
    expect(typeof ai.createOllamaAdapter).toBe("function");
    expect(typeof ai.createCircuitBreakerRegistry).toBe("function");

    // Phase J adds `@clime/meta` (Executive only) — Cost must still not live there.
    const metaCost = join(repoRoot, "packages", "meta", "src", "cost");
    expect(existsSync(metaCost)).toBe(false);
    const metaIndex = join(repoRoot, "packages", "meta", "src", "index.ts");
    if (existsSync(metaIndex)) {
      const metaSrc = readFileSync(metaIndex, "utf8");
      expect(metaSrc).not.toMatch(/createCostIntelligence|CostIntelligence/);
    }
  });

  it("domain package trees have zero vendor SDK imports", () => {
    const domainRoots = [
      join(repoRoot, "packages", "growth"),
      join(repoRoot, "packages", "content"),
      join(repoRoot, "packages", "meta"),
      join(repoRoot, "packages", "decision"),
      join(repoRoot, "packages", "storage"),
      join(repoRoot, "packages", "feature-management"),
      join(repoRoot, "packages", "domain-api"),
      join(repoRoot, "packages", "config"),
      join(repoRoot, "packages", "session"),
    ];

    const offenders: string[] = [];
    for (const root of domainRoots) {
      for (const file of walkTsFiles(root)) {
        const src = readFileSync(file, "utf8");
        for (const re of VENDOR_SDK_PATTERNS) {
          if (re.test(src)) {
            offenders.push(relative(repoRoot, file));
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("vendor SDK packages are not dependencies of domain package.json files", () => {
    const forbidden = [
      "openai",
      "@anthropic-ai/sdk",
      "@google/generative-ai",
      "@google/genai",
      "groq-sdk",
    ];
    const pkgDirs = [
      "growth",
      "content",
      "meta",
      "storage",
      "feature-management",
      "domain-api",
      "config",
      "session",
      "vault",
      "shared",
      "event-bus",
      "observability",
    ];
    const hits: string[] = [];
    for (const dir of pkgDirs) {
      const pkgPath = join(repoRoot, "packages", dir, "package.json");
      if (!existsSync(pkgPath)) continue;
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      for (const name of forbidden) {
        if (pkg.dependencies?.[name] || pkg.devDependencies?.[name]) {
          hits.push(`${dir}:${name}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it("Cost Intelligence module path is packages/ai only", () => {
    const costPath = join(here, "cost", "cost-intelligence.ts");
    expect(existsSync(costPath)).toBe(true);
    const costSrc = readFileSync(costPath, "utf8");
    expect(costSrc).toContain("createCostIntelligence");
    // Meta may exist (Phase J Executive) but must not own Cost.
    expect(existsSync(join(repoRoot, "packages", "meta", "src", "cost"))).toBe(
      false,
    );
  });

  it("contract appendix exists and forbids Meta Cost ownership", () => {
    const contract = join(
      repoRoot,
      "docs",
      "appendix",
      "S45A_AI_ADAPTER_COST_CONTRACT.md",
    );
    expect(existsSync(contract)).toBe(true);
    const text = readFileSync(contract, "utf8");
    expect(text).toContain("packages/ai");
    expect(text).toMatch(/never.*packages\/meta|not.*Meta/i);
    expect(text).toContain("circuit breaker");
    expect(text).toContain("VaultRef");
  });
});
