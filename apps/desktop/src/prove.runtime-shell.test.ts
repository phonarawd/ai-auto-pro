/**
 * Runtime shell close-out — Electron must load Mission Center + persist SQLite.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const desktopRoot = join(here, "..");

describe("desktop runtime shell (operator launch)", () => {
  it("main loads renderer via loadFile and auto-starts under Electron only", () => {
    const main = readFileSync(join(here, "main/index.ts"), "utf8");
    expect(main).toMatch(/loadFile\(/);
    expect(main).toMatch(/resolveRendererHtml/);
    expect(main).toMatch(/startDesktopApp/);
    expect(main).toMatch(/process\.versions\.electron/);
    expect(main).toMatch(/dbPath:\s*resolveDbPath/);
    expect(main).toMatch(/clime-growth\.sqlite/);
    expect(main).toMatch(/clime-growth-studio/);
  });

  it("renderer entry + HTML template exist for build-renderer", () => {
    expect(existsSync(join(here, "renderer/bootstrap.tsx"))).toBe(true);
    expect(existsSync(join(here, "renderer/index.html"))).toBe(true);
    expect(existsSync(join(desktopRoot, "scripts/build-renderer.mjs"))).toBe(true);
    const html = readFileSync(join(here, "renderer/index.html"), "utf8");
    expect(html).toMatch(/id="root"/);
    // mission.js — not app.js (Windows/asar collision with tsc App.js)
    expect(html).toMatch(/mission\.js/);
    expect(html).toMatch(/CLIME AI Growth Studio/);
  });

  it("package build pipeline emits renderer after tsc", () => {
    const pkg = JSON.parse(
      readFileSync(join(desktopRoot, "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.build).toMatch(/build-renderer/);
  });
});
