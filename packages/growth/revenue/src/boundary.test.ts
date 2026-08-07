import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
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

describe("E-B revenue boundary", () => {
  it("never imports drizzle/sqlite/playwright/vendor SDKs or decision", () => {
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
      /from\s+["']@clime\/growth-decision["']/,
      /from\s+["']@clime\/automation["']/,
    ];
    for (const file of listTsFiles(root)) {
      if (file.endsWith(".test.ts")) continue;
      const src = readFileSync(file, "utf8");
      for (const pattern of forbidden) {
        expect(src, `${file} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("package.json has no prisma/supabase/playwright/vendor SDKs", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string>; name?: string };
    expect(pkg.name).toBe("@clime/growth-revenue");
    const deps = Object.keys(pkg.dependencies ?? {});
    expect(deps).toContain("@clime/shared");
    expect(deps).not.toContain("prisma");
    expect(deps).not.toContain("@prisma/client");
    expect(deps).not.toContain("@supabase/supabase-js");
    expect(deps).not.toContain("playwright");
    expect(deps).not.toContain("openai");
    expect(deps).not.toContain("@clime/growth-decision");
  });
});
