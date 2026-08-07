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

describe("B3 workflow boundary", () => {
  it("never imports drizzle/sqlite/playwright/automation internals", () => {
    const root = join(process.cwd(), "src");
    const forbidden = [
      /from\s+["']drizzle-orm/,
      /from\s+["']better-sqlite3["']/,
      /from\s+["']@clime\/automation["']/,
      /from\s+["']playwright["']/,
      /from\s+["']@prisma/,
      /from\s+["']@supabase/,
    ];
    for (const file of listTsFiles(root)) {
      const src = readFileSync(file, "utf8");
      for (const pattern of forbidden) {
        expect(src, `${file} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("package.json has no prisma/supabase/playwright", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };
    const deps = Object.keys(pkg.dependencies ?? {});
    expect(deps).toContain("@clime/shared");
    expect(deps).toContain("@clime/storage");
    expect(deps).not.toContain("prisma");
    expect(deps).not.toContain("@prisma/client");
    expect(deps).not.toContain("@supabase/supabase-js");
    expect(deps).not.toContain("playwright");
  });
});
