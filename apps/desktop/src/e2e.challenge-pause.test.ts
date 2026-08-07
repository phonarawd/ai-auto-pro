import { describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "@clime/shared";
import { createStubBrowserDriver } from "@clime/browser-automation";
import { bootstrapDesktopDomainApi } from "./main/bootstrap-domain-api.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Forbidden user-facing bypass CTAs — not docs saying "no bypass" / data-bypass-cta="0". */
const FORBIDDEN_BYPASS_CTA = [
  /\bcaptcha\s*bypass\b/i,
  /\bbypass\s*captcha\b/i,
  /\bbypass\s*now\b/i,
  /우회\s*하기/,
  /우회\s*CTA/i,
  /solve\s*captcha/i,
  /captcha\s*solve/i,
  /fingerprint\s*spoof/i,
  /proxy\s*identity/i,
];

function hasForbiddenBypassCta(src: string): boolean {
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  return FORBIDDEN_BYPASS_CTA.some((re) => re.test(code));
}

function getAllSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const item of readdirSync(dir)) {
    const full = join(dir, item);
    if (statSync(full).isDirectory()) {
      if (!item.includes("__eslint_fixtures__") && item !== "node_modules") {
        files.push(...getAllSourceFiles(full));
      }
    } else if (item.endsWith(".ts") || item.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

/**
 * F-B: challenge → PAUSED_CHALLENGE + Inbox E2E (우회 경로 0).
 * Full ladder path via alwaysChallenge BAE stub → Account health → Inbox.
 */
describe("F-B challenge → PAUSED_CHALLENGE + Inbox E2E", () => {
  it("session challenge publish → PAUSED_CHALLENGE Inbox with publish traceId; zero posted_*", async () => {
    const ipcMain = { handle: vi.fn() };
    const boot = bootstrapDesktopDomainApi(ipcMain, {
      browserDriver: createStubBrowserDriver({ alwaysChallenge: true }),
    });
    try {
      await boot.storage.seedDefaults();

      const connectRes = await boot.host.handleIpcRequest("domain:account.connect", {
        requestId: "req_fb_c",
        schema_version: SCHEMA_VERSION,
        traceId: "tr_fb_connect",
        args: {
          projectId: "seed_project_empty",
          platform: "naver",
          accountName: "blog-challenge",
          authMode: "session",
        },
      });
      expect(connectRes.ok).toBe(true);
      if (!connectRes.ok) throw new Error("connect");
      const accountId = (connectRes.data as { id: string }).id;

      const produced = await boot.storage.content.createItem({
        projectId: "seed_project_empty",
        workflowRunId: null,
        targetAccountId: accountId,
        channel: "source",
        format: "text",
        status: "ready",
        artifactRef: null,
        metaJson: JSON.stringify({
          schema_version: 1,
          kind: "content.artifact",
          body: "Session post that will hit challenge",
        }),
      });

      const publishTrace = "tr_fb_challenge_e2e";
      const pub = await boot.host.handleIpcRequest("domain:account.publish", {
        requestId: "req_fb_p",
        schema_version: SCHEMA_VERSION,
        traceId: publishTrace,
        args: {
          projectId: "seed_project_empty",
          contentItemId: produced.id,
          accountId,
          platform: "naver",
          skipJitter: true,
        },
      });
      expect(pub.ok).toBe(true);
      if (!pub.ok) throw new Error("publish ipc");
      const data = pub.data as {
        ok: boolean;
        code?: string;
        terminal?: string;
        jobId?: string;
      };
      expect(data.jobId).toMatch(/^job_/);
      expect(data.ok).toBe(false);
      expect(data.code).toBe("PAUSED_CHALLENGE");
      expect(data.terminal).toBe("PAUSED_CHALLENGE");

      await boot.accountEventBus.flush();

      const history = await boot.storage.content.listHistory("seed_project_empty", 50);
      expect(history.some((h) => h.kind.startsWith("posted_"))).toBe(false);

      const inbox = boot.notificationManager.listInbox();
      const challenge = inbox.find((i) => i.terminalState === "PAUSED_CHALLENGE");
      expect(challenge).toBeDefined();
      expect(challenge?.kind).toBe("challenge.pause");
      expect(challenge?.traceId).toBe(publishTrace);
      expect(challenge?.accountId).toBe(accountId);
      expect(
        (challenge?.actions ?? []).every((a) => !hasForbiddenBypassCta(a.label)),
      ).toBe(true);

      const matrix = boot.accountManager.getCapabilityMatrix(accountId, "naver");
      expect(matrix.canPublish).toBe(false);
    } finally {
      await boot.close();
    }
  });

  it("renderer UI source has zero bypass / captcha-solve CTA strings", () => {
    const rendererRoot = join(__dirname, "renderer");
    for (const file of getAllSourceFiles(rendererRoot)) {
      const src = readFileSync(file, "utf8");
      expect(hasForbiddenBypassCta(src), `${file} must not contain bypass CTA`).toBe(
        false,
      );
    }
  });

  it("Inbox / ChallengePauseBanner copy never offers captcha bypass", () => {
    const inbox = readFileSync(
      join(__dirname, "renderer/components/AiInbox.tsx"),
      "utf8",
    );
    const banner = readFileSync(
      join(__dirname, "renderer/components/ChallengePauseBanner.tsx"),
      "utf8",
    );
    expect(inbox).toContain("PAUSED_CHALLENGE");
    expect(banner).toContain("PAUSED_CHALLENGE");
    expect(hasForbiddenBypassCta(inbox)).toBe(false);
    expect(hasForbiddenBypassCta(banner)).toBe(false);
  });
});
