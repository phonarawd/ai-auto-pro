/**
 * Bundle Mission Center renderer + sandboxed preload for Electron loadFile.
 * - renderer: IIFE (asar + file:// cannot fetch ESM modules)
 * - preload: CJS bundle (sandbox preload rejects ESM import)
 * tsc still emits main/; this overwrites dist/preload and emits dist/renderer/.
 */
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import postcss from "postcss";
import tailwindPostcss from "@tailwindcss/postcss";

const here = dirname(fileURLToPath(import.meta.url));
const desktopRoot = join(here, "..");
const outDir = join(desktopRoot, "dist", "renderer");
const cssEntry = join(desktopRoot, "src", "renderer", "styles", "globals.css");

mkdirSync(outDir, { recursive: true });

const cssSource = readFileSync(cssEntry, "utf8");
const cssOut = await postcss([tailwindPostcss()]).process(cssSource, {
  from: cssEntry,
  to: join(outDir, "styles.css"),
});
writeFileSync(join(outDir, "styles.css"), cssOut.css);

await esbuild.build({
  entryPoints: [join(desktopRoot, "src", "renderer", "bootstrap.tsx")],
  // Must NOT be app.js — tsc emits App.js from App.tsx; Windows FS is
  // case-insensitive but asar is case-sensitive → blank window.
  outfile: join(outDir, "mission.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["chrome120"],
  jsx: "automatic",
  logLevel: "info",
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  // CSS is linked from index.html (postcss/tailwind pipeline above)
  loader: { ".css": "empty" },
});

await esbuild.build({
  entryPoints: [join(desktopRoot, "src", "preload", "index.ts")],
  // .cjs — package.json has "type": "module"; Electron preload must be CJS.
  outfile: join(desktopRoot, "dist", "preload", "index.cjs"),
  bundle: true,
  format: "cjs",
  platform: "node",
  target: ["node20"],
  logLevel: "info",
  external: ["electron"],
});

copyFileSync(
  join(desktopRoot, "src", "renderer", "index.html"),
  join(outDir, "index.html"),
);

console.log(`[clime/desktop] renderer → ${outDir}`);
console.log(`[clime/desktop] preload (cjs) → dist/preload/index.cjs`);
