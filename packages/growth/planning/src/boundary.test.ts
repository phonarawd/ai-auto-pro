import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTsFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

describe("D-C planning boundary + Topic home", () => {
  it("Topic Generator lives in planning package", () => {
    const topicFile = join(process.cwd(), "src", "topic-generator.ts");
    expect(existsSync(topicFile)).toBe(true);
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { name?: string };
    expect(pkg.name).toBe("@clime/growth-planning");
  });

  it("never imports drizzle/sqlite/playwright/vendor SDKs or Worker runtime", () => {
    const root = join(process.cwd(), "src");
    const forbidden = [
      /from\s+["']drizzle-orm/,
      /from\s+["']better-sqlite3["']/,
      /from\s+["']playwright["']/,
      /from\s+["']openai["']/,
      /from\s+["']@google\/generative-ai["']/,
      /from\s+["']@anthropic-ai\//,
      /from\s+["']@prisma/,
      /from\s+["']@supabase/,
      /from\s+["']@clime\/automation["']/,
      /from\s+["']@clime\/workflow["']/,
      /plannerQueue\.lease/,
    ];
    for (const file of listTsFiles(root)) {
      if (file.endsWith(".test.ts")) continue;
      const src = readFileSync(file, "utf8");
      for (const pattern of forbidden) {
        expect(src, `${file} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("depends on research read ports; package.json clean", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };
    const deps = Object.keys(pkg.dependencies ?? {});
    expect(deps).toContain("@clime/growth-research");
    expect(deps).toContain("@clime/shared");
    expect(deps).not.toContain("prisma");
    expect(deps).not.toContain("@supabase/supabase-js");
    expect(deps).not.toContain("playwright");
    expect(deps).not.toContain("openai");
  });
});
