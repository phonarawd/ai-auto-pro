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

describe("I-B learning boundary", () => {
  it("never imports drizzle/sqlite/meta/decision/automation/vendor SDKs", () => {
    const root = join(process.cwd(), "src");
    const forbidden = [
      /from\s+["']drizzle-orm/,
      /from\s+["']better-sqlite3["']/,
      /from\s+["']playwright["']/,
      /from\s+["']openai["']/,
      /from\s+["']@prisma/,
      /from\s+["']@supabase/,
      /from\s+["']@clime\/meta["']/,
      /from\s+["']@clime\/growth-decision["']/,
      /from\s+["']@clime\/automation["']/,
      /goals\.create/,
      /runDailyDecision/,
    ];
    for (const file of listTsFiles(root)) {
      if (file.endsWith(".test.ts")) continue;
      const src = readFileSync(file, "utf8");
      for (const pattern of forbidden) {
        expect(src, `${file} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("package.json clean — @clime/learning owns Reflection, not Meta", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string>; name?: string };
    expect(pkg.name).toBe("@clime/learning");
    const deps = Object.keys(pkg.dependencies ?? {});
    expect(deps).toContain("@clime/shared");
    expect(deps).toContain("@clime/storage");
    expect(deps).toContain("@clime/memory");
    expect(deps).not.toContain("@clime/meta");
    expect(deps).not.toContain("prisma");
    expect(deps).not.toContain("@supabase/supabase-js");
    expect(deps).not.toContain("openai");
  });
});
