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

describe("B3 automation boundary", () => {
  it("never imports drizzle/sqlite/playwright/prisma", () => {
    const root = join(process.cwd(), "src");
    const forbidden = [
      /from\s+["']drizzle-orm/,
      /from\s+["']better-sqlite3["']/,
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

  it("package.json deps stay lean", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };
    const deps = Object.keys(pkg.dependencies ?? {});
    expect(deps).toEqual(
      expect.arrayContaining([
        "@clime/shared",
        "@clime/storage",
        "@clime/workflow",
        "zod",
      ]),
    );
    expect(deps).not.toContain("playwright");
    expect(deps).not.toContain("@prisma/client");
  });

  it("START path source never calls worker.tick", () => {
    const runtimeSrc = readFileSync(
      join(process.cwd(), "src", "runtime.ts"),
      "utf8",
    );
    const startBlock = runtimeSrc.slice(
      runtimeSrc.indexOf("async startMission"),
      runtimeSrc.indexOf("stop()"),
    );
    expect(startBlock).toContain("enqueueMission");
    expect(startBlock).not.toMatch(/\bworker\.tick\b/);
    expect(startBlock).not.toContain("leaseNext");
  });
});
