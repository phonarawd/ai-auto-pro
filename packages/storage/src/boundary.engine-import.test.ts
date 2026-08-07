import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const FORBIDDEN_IMPORT =
  /\bfrom\s+["']drizzle-orm(?:\/[^"']*)?["']|\bfrom\s+["']better-sqlite3["']|\brequire\(\s*["']drizzle-orm|\brequire\(\s*["']better-sqlite3|\bfrom\s+["']@prisma\/|\bfrom\s+["']prisma["']|\bfrom\s+["']@supabase\//;

/** Product deps forbidden in V1 (s2-a §0 / s2-d prove). */
const FORBIDDEN_DEP_NAMES = new Set([
  "prisma",
  "@prisma/client",
  "@prisma/engines",
  "@supabase/supabase-js",
  "@supabase/ssr",
  "postgres",
  "pg",
  "@vercel/postgres",
]);

async function collectTsFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name === ".turbo"
      ) {
        continue;
      }
      out.push(...(await collectTsFiles(full)));
    } else if (entry.isFile() && /\.(ts|tsx|js|mjs)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function repoRootFromHere(): string {
  const here = fileURLToPath(new URL(".", import.meta.url));
  return join(here, "..", "..", "..");
}

async function collectPackageJsonPaths(repoRoot: string): Promise<string[]> {
  const out: string[] = [join(repoRoot, "package.json")];
  for (const area of ["packages", "apps"] as const) {
    const areaRoot = join(repoRoot, area);
    let names: string[];
    try {
      names = await readdir(areaRoot);
    } catch {
      continue;
    }
    for (const name of names) {
      const pkgPath = join(areaRoot, name, "package.json");
      try {
        if ((await stat(pkgPath)).isFile()) out.push(pkgPath);
      } catch {
        /* skip */
      }
    }
  }
  return out;
}

describe("s2-d Storage Prove — Repo-only · Prisma0 · Supabase0", () => {
  it("non-storage packages do not import drizzle-orm / better-sqlite3 / prisma / supabase", async () => {
    const repoRoot = repoRootFromHere();
    const packagesRoot = join(repoRoot, "packages");
    const appsRoot = join(repoRoot, "apps");

    const packageDirs = (await readdir(packagesRoot)).filter(
      (name) => name !== "storage",
    );
    const scanRoots: string[] = [];
    for (const name of packageDirs) {
      const src = join(packagesRoot, name, "src");
      try {
        if ((await stat(src)).isDirectory()) scanRoots.push(src);
      } catch {
        /* no src */
      }
    }
    try {
      if ((await stat(appsRoot)).isDirectory()) scanRoots.push(appsRoot);
    } catch {
      /* no apps */
    }

    const offenders: string[] = [];
    for (const root of scanRoots) {
      const files = await collectTsFiles(root);
      for (const file of files) {
        const text = await readFile(file, "utf8");
        if (FORBIDDEN_IMPORT.test(text)) {
          offenders.push(relative(repoRoot, file).replace(/\\/g, "/"));
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("workspace package.json has Prisma client 0 and Supabase/Postgres client 0", async () => {
    const repoRoot = repoRootFromHere();
    const pkgPaths = await collectPackageJsonPaths(repoRoot);
    const offenders: string[] = [];

    for (const pkgPath of pkgPaths) {
      const raw = await readFile(pkgPath, "utf8");
      const pkg = JSON.parse(raw) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        optionalDependencies?: Record<string, string>;
        peerDependencies?: Record<string, string>;
      };
      for (const field of [
        "dependencies",
        "devDependencies",
        "optionalDependencies",
        "peerDependencies",
      ] as const) {
        const block = pkg[field];
        if (!block) continue;
        for (const name of Object.keys(block)) {
          if (FORBIDDEN_DEP_NAMES.has(name) || name.startsWith("@supabase/")) {
            offenders.push(
              `${relative(repoRoot, pkgPath).replace(/\\/g, "/")}:${field}:${name}`,
            );
          }
        }
      }
    }

    expect(offenders).toEqual([]);
    // Storage must keep Drizzle + SQLite driver (positive lock).
    const storagePkg = JSON.parse(
      await readFile(join(repoRoot, "packages", "storage", "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };
    expect(storagePkg.dependencies?.["drizzle-orm"]).toBeTruthy();
    expect(storagePkg.dependencies?.["better-sqlite3"]).toBeTruthy();
    expect(storagePkg.dependencies?.prisma).toBeUndefined();
    expect(storagePkg.dependencies?.["@prisma/client"]).toBeUndefined();
  });

  it(
    "public @clime/storage surface does not re-export Drizzle schema/client",
    async () => {
      const mod = await import("./index.js");
      expect(mod.createSqliteStorage).toBeTypeOf("function");
      expect(mod.createAndSeedSqliteStorage).toBeTypeOf("function");
      expect(mod.FIRST_CLASS_TABLE_COUNT).toBe(25);
      expect("schema" in mod).toBe(false);
      expect("openSqliteDatabase" in mod).toBe(false);
      expect("project" in mod).toBe(false);
      expect("WriteGate" in mod).toBe(false);
      expect("AsyncMutex" in mod).toBe(false);
    },
    20_000,
  );

  it("no second WAL/mutex layer outside @clime/storage (s2-e-a §0)", async () => {
    const repoRoot = repoRootFromHere();
    const packagesRoot = join(repoRoot, "packages");
    const appsRoot = join(repoRoot, "apps");
    const packageDirs = (await readdir(packagesRoot)).filter(
      (name) => name !== "storage",
    );
    // Public `runAtomicWrite` callers are allowed; duplicate WAL/mutex is not.
    const hardeningLeak =
      /journal_mode\s*=\s*WAL|BEGIN IMMEDIATE|class AsyncMutex|class WriteGate/;
    const scanRoots: string[] = [];
    for (const name of packageDirs) {
      const src = join(packagesRoot, name, "src");
      try {
        if ((await stat(src)).isDirectory()) scanRoots.push(src);
      } catch {
        /* no src */
      }
    }
    try {
      if ((await stat(appsRoot)).isDirectory()) scanRoots.push(appsRoot);
    } catch {
      /* no apps */
    }

    const offenders: string[] = [];
    for (const root of scanRoots) {
      const files = await collectTsFiles(root);
      for (const file of files) {
        const text = await readFile(file, "utf8");
        if (hardeningLeak.test(text)) {
          offenders.push(relative(repoRoot, file).replace(/\\/g, "/"));
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
