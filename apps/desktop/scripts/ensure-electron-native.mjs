/**
 * Rebuild better-sqlite3 against the local Electron ABI before `electron .`.
 * After the app exits, restore Node ABI for Vitest/CI:
 *   pnpm --filter @clime/desktop run rebuild:node-native
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const desktopRoot = join(here, "..");
const require = createRequire(join(desktopRoot, "package.json"));

let electronVersion = "43.3.0";
try {
  electronVersion = require("electron/package.json").version;
} catch {
  /* keep default */
}

console.log(`[clime/desktop] rebuilding better-sqlite3 for Electron ${electronVersion}...`);

const result = spawnSync(
  "pnpm",
  [
    "exec",
    "electron-rebuild",
    "-f",
    "-w",
    "better-sqlite3",
    "--version",
    electronVersion,
  ],
  {
    cwd: desktopRoot,
    stdio: "inherit",
    shell: true,
    env: process.env,
  },
);

if (result.status !== 0) {
  console.error("[clime/desktop] electron native rebuild failed");
  process.exit(result.status ?? 1);
}

console.log("[clime/desktop] electron native ready");
