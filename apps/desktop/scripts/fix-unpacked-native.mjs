/**
 * After electron-builder packs, ensure better-sqlite3 in win-unpacked
 * matches Electron ABI (pnpm can leave a Node-built .node in asar.unpacked).
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const desktopRoot = join(here, "..");
const repoRoot = join(desktopRoot, "..", "..");
const require = createRequire(join(desktopRoot, "package.json"));

const destNode = join(
  desktopRoot,
  "release",
  "win-unpacked",
  "resources",
  "app.asar.unpacked",
  "node_modules",
  "better-sqlite3",
  "build",
  "Release",
  "better_sqlite3.node",
);

if (!existsSync(dirname(destNode))) {
  console.warn("[clime/desktop] unpacked better-sqlite3 tree missing — skip native sync");
  process.exit(0);
}

function findWorkspaceNative() {
  const candidates = [];
  try {
    const resolved = require.resolve("better-sqlite3/package.json");
    candidates.push(join(dirname(resolved), "build", "Release", "better_sqlite3.node"));
  } catch {
    /* not hoisted on desktop */
  }

  const pnpmRoot = join(repoRoot, "node_modules", ".pnpm");
  if (existsSync(pnpmRoot)) {
    for (const entry of readdirSync(pnpmRoot)) {
      if (!entry.startsWith("better-sqlite3@")) continue;
      candidates.push(
        join(
          pnpmRoot,
          entry,
          "node_modules",
          "better-sqlite3",
          "build",
          "Release",
          "better_sqlite3.node",
        ),
      );
    }
  }

  return candidates.find((p) => existsSync(p)) ?? null;
}

const src = findWorkspaceNative();
if (!src) {
  console.warn(
    "[clime/desktop] no workspace better_sqlite3.node found — relying on electron-builder rebuild",
  );
  process.exit(0);
}

mkdirSync(dirname(destNode), { recursive: true });
try {
  copyFileSync(src, destNode);
  console.log(`[clime/desktop] synced Electron native → ${destNode}`);
} catch (err) {
  const code = err && typeof err === "object" && "code" in err ? err.code : "";
  if (code === "EBUSY" && existsSync(destNode)) {
    console.warn("[clime/desktop] dest locked (app running) — keeping existing native");
    process.exit(0);
  }
  throw err;
}
