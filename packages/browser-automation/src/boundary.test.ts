import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { BAE_BROWSER_SDK_HOME, PLAYWRIGHT_PACKAGE_ID } from "./playwright-home.js";

function listTsFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTsFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

const FORBIDDEN_SDK_IMPORT =
  /from\s+["'](playwright|puppeteer)["']|require\s*\(\s*["'](playwright|puppeteer)["']\s*\)/;

const CONNECTOR_SURFACE_ROOTS = [
  join(process.cwd(), "..", "connector-registry", "src"),
  join(process.cwd(), "..", "plugin-sdk", "src"),
  join(process.cwd(), "..", "account", "src"),
  join(process.cwd(), "..", "content", "src"),
  join(process.cwd(), "..", "workflow", "src"),
  join(process.cwd(), "..", "automation", "src"),
];

describe("C2-B BAE Playwright boundary", () => {
  it("registers @clime/browser-automation as Playwright home", () => {
    expect(BAE_BROWSER_SDK_HOME.package).toBe("@clime/browser-automation");
    expect(BAE_BROWSER_SDK_HOME.allowedModules).toContain(PLAYWRIGHT_PACKAGE_ID);
  });

  it("connector surfaces never import playwright/puppeteer", () => {
    for (const root of CONNECTOR_SURFACE_ROOTS) {
      for (const file of listTsFiles(root)) {
        if (file.endsWith(".test.ts")) continue;
        const src = readFileSync(file, "utf8");
        expect(src, `${file} must not import playwright/puppeteer`).not.toMatch(
          FORBIDDEN_SDK_IMPORT,
        );
      }
    }
  });

  it("connector-facing packages do not declare playwright dependency", () => {
    const pkgs = [
      "connector-registry",
      "plugin-sdk",
      "account",
      "content",
      "workflow",
      "automation",
    ];
    for (const name of pkgs) {
      const pkgPath = join(process.cwd(), "..", name, "package.json");
      if (!existsSync(pkgPath)) continue;
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const deps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };
      expect(deps, `${name} must not depend on playwright`).not.toHaveProperty(
        "playwright",
      );
      expect(deps, `${name} must not depend on puppeteer`).not.toHaveProperty(
        "puppeteer",
      );
    }
  });

  it("BAE package.json stays free of captcha solver SDKs", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };
    const deps = Object.keys(pkg.dependencies ?? {});
    expect(deps).toContain("@clime/shared");
    expect(deps).not.toContain("2captcha");
    expect(deps).not.toContain("@antiadmin/anticaptcha-official");
    expect(deps).not.toContain("captcha-solver");
  });

  it("BAE source has zero captcha bypass / stealth spoof helpers", () => {
    const root = join(process.cwd(), "src");
    const forbidden = [
      /solveCaptcha\s*\(/i,
      /bypassCaptcha\s*\(/i,
      /fingerprintSpoof/i,
      /stealthPlugin/i,
      /from\s+["'][^"']*2captcha/i,
      /from\s+["'][^"']*anticaptcha/i,
    ];
    for (const file of listTsFiles(root)) {
      if (file.endsWith(".test.ts")) continue;
      const src = readFileSync(file, "utf8");
      for (const pattern of forbidden) {
        expect(src, `${file} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});
