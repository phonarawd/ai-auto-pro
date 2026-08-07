import { describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION, publishingHistoryKindSchema } from "@clime/shared";
import { createStubBrowserDriver } from "@clime/browser-automation";
import { PUBLISHING_HISTORY_KINDS } from "@clime/content";
import { bootstrapDesktopDomainApi } from "./main/bootstrap-domain-api.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const item of readdirSync(dir)) {
    const full = join(dir, item);
    if (statSync(full).isDirectory()) {
      if (item !== "node_modules" && !item.includes("__eslint_fixtures__")) {
        out.push(...walk(full));
      }
    } else if (/\.(ts|tsx)$/.test(item) && !item.includes(".test.")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * F-C Trust Prove — 침묵실패 0 · History enums · UX Gate evidence.
 */
describe("F-C Trust Prove", () => {
  it("challenge never silently writes posted_* (침묵실패 0)", async () => {
    const ipcMain = { handle: vi.fn() };
    const boot = bootstrapDesktopDomainApi(ipcMain, {
      browserDriver: createStubBrowserDriver({ alwaysChallenge: true }),
    });
    try {
      await boot.storage.seedDefaults();
      const connectRes = await boot.host.handleIpcRequest("domain:account.connect", {
        requestId: "req_fc_c",
        schema_version: SCHEMA_VERSION,
        traceId: "tr_fc_c",
        args: {
          projectId: "seed_project_empty",
          platform: "naver",
          accountName: "fc",
          authMode: "session",
        },
      });
      if (!connectRes.ok) throw new Error("connect");
      const accountId = (connectRes.data as { id: string }).id;
      const item = await boot.storage.content.createItem({
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
          body: "fc challenge body",
        }),
      });

      const pub = await boot.host.handleIpcRequest("domain:account.publish", {
        requestId: "req_fc_p",
        schema_version: SCHEMA_VERSION,
        traceId: "tr_fc_silent",
        args: {
          projectId: "seed_project_empty",
          contentItemId: item.id,
          accountId,
          platform: "naver",
          skipJitter: true,
        },
      });
      expect(pub.ok).toBe(true);
      if (!pub.ok) throw new Error("pub");
      expect((pub.data as { ok: boolean }).ok).toBe(false);
      expect((pub.data as { code: string }).code).toBe("PAUSED_CHALLENGE");

      await boot.accountEventBus.flush();

      const history = await boot.storage.content.listHistory("seed_project_empty", 100);
      expect(history.filter((h) => h.kind.startsWith("posted_"))).toHaveLength(0);

      const inbox = boot.notificationManager.listInbox();
      expect(inbox.some((i) => i.terminalState === "PAUSED_CHALLENGE" && i.traceId)).toBe(
        true,
      );
    } finally {
      await boot.close();
    }
  });

  it("PublishingHistory kinds are exactly the frozen enum (Zod)", () => {
    expect([...PUBLISHING_HISTORY_KINDS]).toEqual([
      "draft",
      "export",
      "scheduled",
      "posted_manual",
      "posted_api",
      "posted_session",
    ]);
    for (const kind of PUBLISHING_HISTORY_KINDS) {
      expect(publishingHistoryKindSchema.safeParse(kind).success).toBe(true);
    }
    expect(publishingHistoryKindSchema.safeParse("posted_bot").success).toBe(false);
    expect(publishingHistoryKindSchema.safeParse("success").success).toBe(false);
  });

  it("UX Gate: challenge surfaces + History UI + zero bypass CTA in desktop src", () => {
    const mission = readFileSync(
      join(__dirname, "renderer/components/MissionCenterFrame.tsx"),
      "utf8",
    );
    const history = readFileSync(
      join(__dirname, "renderer/components/PublishingHistoryPanel.tsx"),
      "utf8",
    );
    const inbox = readFileSync(
      join(__dirname, "renderer/components/AiInbox.tsx"),
      "utf8",
    );
    const banner = readFileSync(
      join(__dirname, "renderer/components/ChallengePauseBanner.tsx"),
      "utf8",
    );

    expect(mission).toContain("CLIME AI Growth Studio");
    expect(mission).toMatch(/올린 기록|COPY\.nav\.history/);
    expect(mission).toMatch(/파일로 보관|COPY\.cta\.export/);
    expect(history).toMatch(/올린 기록|COPY\.history/);
    expect(history).toContain("posted_api");
    expect(history).toContain("posted_session");
    expect(inbox).toContain("PAUSED_CHALLENGE");
    expect(banner).toContain("PAUSED_CHALLENGE");

    for (const file of walk(join(__dirname, "renderer"))) {
      const src = readFileSync(file, "utf8");
      expect(hasForbiddenBypassCta(src), file).toBe(false);
    }
  });
});
