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

describe("B2 notification boundary", () => {
  it("never imports Playwright / captcha solvers / plugins internals", () => {
    const root = join(process.cwd(), "src");
    const forbidden = [
      /from\s+["']playwright["']/,
      /from\s+["']puppeteer["']/,
      /from\s+["'][^"']*plugins\//,
      /from\s+["'][^"']*2captcha[^"']*["']/,
      /from\s+["'][^"']*anticaptcha[^"']*["']/,
    ];

    for (const file of listTsFiles(root)) {
      if (file.endsWith(".test.ts")) continue;
      const src = readFileSync(file, "utf8");
      for (const pattern of forbidden) {
        expect(src, `${file} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("package stays lean (no storage/orm/BAE)", async () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };
    const deps = Object.keys(pkg.dependencies ?? {});
    expect(deps).toEqual(expect.arrayContaining(["@clime/shared", "@clime/event-bus", "zod"]));
    expect(deps).not.toContain("@clime/storage");
    expect(deps).not.toContain("@clime/browser-automation");
    expect(deps).not.toContain("drizzle-orm");
  });
});
