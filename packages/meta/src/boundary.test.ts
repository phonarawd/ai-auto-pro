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

describe("J-B meta boundary", () => {
  it("never imports drizzle/sqlite/automation/decision-write/learning/ai/vendor SDKs", () => {
    const root = join(process.cwd(), "src");
    const forbidden = [
      /from\s+["']drizzle-orm/,
      /from\s+["']better-sqlite3["']/,
      /from\s+["']playwright["']/,
      /from\s+["']openai["']/,
      /from\s+["']@prisma/,
      /from\s+["']@supabase/,
      /from\s+["']@clime\/automation["']/,
      /from\s+["']@clime\/workflow["']/,
      /from\s+["']@clime\/learning["']/,
      /from\s+["']@clime\/ai["']/,
      /from\s+["']@clime\/growth-decision["']/,
      /runDailyDecision/,
      /plannerQueue\./,
      /enqueueFromDecision/,
      /decisions\.create/,
      /startMission/,
    ];
    for (const file of listTsFiles(root)) {
      if (file.endsWith(".test.ts")) continue;
      const src = readFileSync(file, "utf8");
      for (const pattern of forbidden) {
        expect(src, `${file} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("package.json is Meta slim — Executive+Goal deps only", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string>; name?: string };
    expect(pkg.name).toBe("@clime/meta");
    const deps = Object.keys(pkg.dependencies ?? {});
    expect(deps).toContain("@clime/shared");
    expect(deps).toContain("@clime/storage");
    expect(deps).toContain("zod");
    expect(deps).not.toContain("@clime/learning");
    expect(deps).not.toContain("@clime/ai");
    expect(deps).not.toContain("@clime/automation");
    expect(deps).not.toContain("@clime/growth-decision");
    expect(deps).not.toContain("prisma");
    expect(deps).not.toContain("@supabase/supabase-js");
    expect(deps).not.toContain("openai");
  });
});
