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

describe("B1 lean boundary — Manifest only", () => {
  it("account/connector-registry/plugin-sdk never import plugins/* internals", () => {
    const roots = [
      join(process.cwd(), "src"),
      join(process.cwd(), "..", "connector-registry", "src"),
      join(process.cwd(), "..", "plugin-sdk", "src"),
    ];

    const forbidden = [
      /from\s+["'][^"']*plugins\//,
      /from\s+["'][^"']*naver-blog/,
      /from\s+["']playwright["']/,
      /from\s+["']puppeteer["']/,
    ];

    for (const root of roots) {
      for (const file of listTsFiles(root)) {
        const src = readFileSync(file, "utf8");
        for (const pattern of forbidden) {
          expect(src, `${file} matched ${pattern}`).not.toMatch(pattern);
        }
      }
    }
  });

  it("plugin-sdk package.json stays lean (no account/registry/BAE/storage)", async () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "..", "plugin-sdk", "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };
    const deps = Object.keys(pkg.dependencies ?? {});
    expect(deps).toEqual(expect.arrayContaining(["@clime/shared", "zod"]));
    expect(deps).not.toContain("@clime/account");
    expect(deps).not.toContain("@clime/connector-registry");
    expect(deps).not.toContain("@clime/storage");
    expect(deps).not.toContain("@clime/browser-automation");
  });
});
