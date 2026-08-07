/**
 * Sole Playwright / browser-driver home (RFC 10 / 12 / C2A §4).
 *
 * Connectors, plugin-sdk, connector-registry, account, content, workflow,
 * and automation MUST NEVER import the `playwright` (or `puppeteer`) package.
 * All browser tech enters through `@clime/browser-automation` only.
 */

/** Canonical npm package id for Chromium automation. */
export const PLAYWRIGHT_PACKAGE_ID = "playwright" as const;

/** Forbidden alternate browser SDK — also blocked outside this package. */
export const PUPPETEER_PACKAGE_ID = "puppeteer" as const;

/**
 * Marker proving this package is the Playwright home.
 * Boundary tests assert no other package imports these module ids.
 */
export const BAE_BROWSER_SDK_HOME = {
  package: "@clime/browser-automation",
  allowedModules: [PLAYWRIGHT_PACKAGE_ID, PUPPETEER_PACKAGE_ID] as const,
} as const;

export type PlaywrightModuleLike = {
  chromium: {
    launch: (options?: Record<string, unknown>) => Promise<{
      close: () => Promise<void>;
      newContext: (options?: Record<string, unknown>) => Promise<{
        close: () => Promise<void>;
        newPage: () => Promise<{
          goto: (url: string) => Promise<unknown>;
          close: () => Promise<void>;
        }>;
      }>;
    }>;
  };
};

/**
 * Dynamic load of Playwright — only callable from BAE.
 * Returns null when the optional runtime dependency is not installed (CI stub path).
 * Uses Function-based import so TypeScript does not require the package at build time;
 * the string module id still lives only in this package for boundary audits.
 */
export async function importPlaywrightHome(): Promise<PlaywrightModuleLike | null> {
  try {
    const dynamicImport = new Function(
      "id",
      "return import(id)",
    ) as (id: string) => Promise<PlaywrightModuleLike>;
    return await dynamicImport(PLAYWRIGHT_PACKAGE_ID);
  } catch {
    return null;
  }
}
