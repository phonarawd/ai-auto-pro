import type { SessionSandboxHandle } from "./session-sandbox.js";
import { importPlaywrightHome } from "./playwright-home.js";

export type BrowserPublishRequest = {
  accountId: string;
  platform: string;
  body: string;
  title?: string;
  sandbox: SessionSandboxHandle;
  traceId: string;
};

export type BrowserPublishOutcome =
  | { ok: true; externalPostId: string }
  | { ok: false; challenge: true; reason: string }
  | { ok: false; challenge: false; reason: string };

/**
 * BAE driver port — Playwright implementation lives behind this interface only.
 */
export type BrowserDriver = {
  sessionPublish(input: BrowserPublishRequest): Promise<BrowserPublishOutcome>;
};

export type StubBrowserDriverOptions = {
  /** Force challenge on every publish (tests). */
  alwaysChallenge?: boolean;
  /** Accounts that trigger challenge. */
  challengeAccountIds?: ReadonlySet<string>;
};

export function createStubBrowserDriver(
  options?: StubBrowserDriverOptions,
): BrowserDriver {
  const challengeIds = options?.challengeAccountIds ?? new Set<string>();
  return {
    async sessionPublish(input) {
      if (options?.alwaysChallenge || challengeIds.has(input.accountId)) {
        return {
          ok: false,
          challenge: true,
          reason: "Security challenge or lock detected during session publish",
        };
      }
      return {
        ok: true,
        externalPostId: `session_${input.platform}_${input.accountId}_${Date.now().toString(36)}`,
      };
    },
  };
}

/**
 * Attempts real Playwright launch when available; otherwise falls back to stub.
 * Challenge-solving / stealth spoof helpers are intentionally absent (merge blocker).
 */
export function createPlaywrightBackedDriver(
  fallback: BrowserDriver = createStubBrowserDriver(),
): BrowserDriver {
  return {
    async sessionPublish(input) {
      const pw = await importPlaywrightHome();
      if (!pw) {
        return fallback.sessionPublish(input);
      }
      // Real browser path: open isolated context per sandbox — pause on challenge only.
      try {
        const browser = await pw.chromium.launch({ headless: true });
        try {
          const context = await browser.newContext({
            // Isolation hint — storageState never shared across accounts
            storageState: undefined,
          });
          try {
            const page = await context.newPage();
            await page.close();
          } finally {
            await context.close();
          }
        } finally {
          await browser.close();
        }
        // Without platform-specific selectors, V1 delegates body post to stub success
        // after proving browser launch works — connectors supply selectors later via Manifest.
        return fallback.sessionPublish(input);
      } catch (err) {
        return {
          ok: false,
          challenge: false,
          reason: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}
