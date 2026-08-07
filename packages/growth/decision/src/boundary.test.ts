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

describe("E-C decision boundary", () => {
  it("never imports drizzle/sqlite/playwright/vendor SDKs or Worker/automation lease", () => {
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
      /\.lease\(/,
      /createWorker|WorkerRuntime|startWorker/,
    ];
    for (const file of listTsFiles(root)) {
      if (file.endsWith(".test.ts")) continue;
      const src = readFileSync(file, "utf8");
      for (const pattern of forbidden) {
        expect(src, `${file} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("package.json depends on revenue + planning queue producer path", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string>; name?: string };
    expect(pkg.name).toBe("@clime/growth-decision");
    const deps = Object.keys(pkg.dependencies ?? {});
    expect(deps).toContain("@clime/growth-revenue");
    expect(deps).toContain("@clime/growth-planning");
    expect(deps).toContain("@clime/storage");
    expect(deps).not.toContain("@clime/automation");
    expect(deps).not.toContain("prisma");
    expect(deps).not.toContain("playwright");
    expect(deps).not.toContain("openai");
  });
});
