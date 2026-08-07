import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "@clime/shared";
import { MissionCenterFrame } from "./renderer/components/MissionCenterFrame.js";
import { AiConnectionWizard } from "./renderer/components/AiConnectionWizard.js";
import { ChallengePauseBanner } from "./renderer/components/ChallengePauseBanner.js";
import { bootstrapDesktopDomainApi } from "./main/bootstrap-domain-api.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

describe("B2-C Inbox/Wizard Prove", () => {
  it("challenge → PAUSED_CHALLENGE Inbox (침묵실패 0) via Account pausePublish", async () => {
    const ipcMain = { handle: vi.fn() };
    const boot = bootstrapDesktopDomainApi(ipcMain);
    try {
      const { host, accountManager, notificationManager, accountEventBus } = boot;

      const account = accountManager.connectAccount({
        projectId: "default-project",
        platform: "naver",
        accountName: "Naver Blog",
        authMode: "session",
      });

      const pauseRes = await host.handleIpcRequest("domain:account.pausePublish", {
        requestId: "req_pause_b2",
        schema_version: SCHEMA_VERSION,
        traceId: "tr_pause_b2",
        args: { accountId: account.id, reason: "Captcha challenge" },
      });
      expect(pauseRes.ok).toBe(true);
      await accountEventBus.flush();

      const inbox = notificationManager.listInbox();
      expect(inbox.length).toBeGreaterThanOrEqual(1);
      const challenge = inbox.find((i) => i.terminalState === "PAUSED_CHALLENGE");
      expect(challenge).toBeDefined();
      expect(challenge?.kind).toBe("challenge.pause");
      expect(challenge?.traceId).toBeTruthy();

      const matrix = accountManager.getCapabilityMatrix(account.id, "naver");
      expect(matrix.canPublish).toBe(false);
    } finally {
      await boot.close();
    }
  });

  it("START → jobId ack + Inbox job.enqueued (progress path, no UI await)", async () => {
    const ipcMain = { handle: vi.fn() };
    const boot = bootstrapDesktopDomainApi(ipcMain);
    try {
      const { host, notificationManager } = boot;

      const res = await host.handleIpcRequest("domain:automation.startMission", {
        requestId: "req_start_b2",
        schema_version: SCHEMA_VERSION,
        traceId: "tr_start_b2",
        args: { missionId: "mission-today-stub" },
      });
      expect(res.ok).toBe(true);
      if (!res.ok) throw new Error("expected startMission ok");
      const data = res.data as { jobId: string; traceId: string };
      expect(data.jobId).toMatch(/^job_/);

      await Promise.resolve();
      await Promise.resolve();

      const enqueued = notificationManager.listInbox().find((i) => i.kind === "job.enqueued");
      expect(enqueued).toBeDefined();
      expect(enqueued?.jobId).toBe(data.jobId);
    } finally {
      await boot.close();
    }
  });

  it("wizard skip + resume via account.wizardProgress", async () => {
    const ipcMain = { handle: vi.fn() };
    const boot = bootstrapDesktopDomainApi(ipcMain);
    try {
      const { host } = boot;

      const skip = await host.handleIpcRequest("domain:account.wizardProgress", {
        requestId: "req_wiz_1",
        schema_version: SCHEMA_VERSION,
        traceId: "tr_wiz_1",
        args: { step: "skipped", completed: true },
      });
      expect(skip.ok).toBe(true);
      if (!skip.ok) throw new Error("expected wizard skip ok");
      expect((skip.data as { completed: boolean; step: string }).completed).toBe(true);
      expect((skip.data as { step: string }).step).toBe("skipped");

      const resume = await host.handleIpcRequest("domain:account.wizardProgress", {
        requestId: "req_wiz_2",
        schema_version: SCHEMA_VERSION,
        traceId: "tr_wiz_2",
        args: { step: "connect", completed: false },
      });
      expect(resume.ok).toBe(true);
      if (!resume.ok) throw new Error("expected wizard resume ok");
      expect((resume.data as { step: string; completed: boolean }).step).toBe("connect");
      expect((resume.data as { completed: boolean }).completed).toBe(false);
    } finally {
      await boot.close();
    }
  });

  it("notification.listInbox Domain API returns items after challenge", async () => {
    const ipcMain = { handle: vi.fn() };
    const boot = bootstrapDesktopDomainApi(ipcMain);
    const { host, accountManager, accountEventBus } = boot;
    try {
    const account = accountManager.connectAccount({
      projectId: "default-project",
      platform: "instagram",
      accountName: "IG",
      authMode: "oauth",
    });
    await host.handleIpcRequest("domain:account.pausePublish", {
      requestId: "req_p2",
      schema_version: SCHEMA_VERSION,
      traceId: "tr_p2",
      args: { accountId: account.id },
    });
    await accountEventBus.flush();

    const listRes = await host.handleIpcRequest("domain:notification.listInbox", {
      requestId: "req_list",
      schema_version: SCHEMA_VERSION,
      traceId: "tr_list",
      args: {},
    });
    expect(listRes.ok).toBe(true);
    if (!listRes.ok) throw new Error("expected listInbox ok");
    const items = listRes.data as Array<{ terminalState?: string }>;
    expect(items.some((i) => i.terminalState === "PAUSED_CHALLENGE")).toBe(true);
    } finally {
      await boot.close();
    }
  });

  it("UX: challenge pause banner has zero bypass CTA", () => {
    const html = renderToString(
      <ChallengePauseBanner
        visible
        platform="naver"
        traceId="tr_ux_challenge"
        onOpenInbox={() => undefined}
        onResume={() => undefined}
      />,
    );
    expect(html).toContain('data-terminal="PAUSED_CHALLENGE"');
    expect(html).toContain("data-bypass-cta=\"0\"");
    expect(html).toContain("알림함 보기");
    expect(html).not.toMatch(/captcha\s*bypass/i);
    expect(html).not.toMatch(/우회\s*하기/);
    expect(html).not.toMatch(/solve\s*captcha/i);
  });

  it("UX: Wizard exposes skip + resume (나중에 이어서)", () => {
    const html = renderToString(
      <AiConnectionWizard open onClose={() => undefined} onFinished={() => undefined} />,
    );
    expect(html).toMatch(/처음 연결 도우미|AI Connection Wizard/);
    expect(html).toContain("건너뛰기");
    expect(html).toContain("나중에 이어서");
  });

  it("UX Gate: Mission Center still brand + CTA + status; Quick Actions + Inbox chrome", () => {
    const html = renderToString(<MissionCenterFrame />).replace(/<!-- -->/g, "");
    expect(html).toContain("CLIME AI Growth Studio");
    expect(html).toContain("오늘 홍보 시작");
    expect(html).toContain("자동으로 올리기");
    expect(html).toContain("파일로 보관");
    expect(html).toContain("지금 상황");
    expect(html).toContain("알림함");
    expect(html).toContain("빠른 실행");
    expect(html).not.toMatch(/Followers/i);
    expect(html).not.toMatch(/captcha\s*bypass/i);
  });

  it("renderer has zero bypass CTA copy and zero bus/engine imports", () => {
    const rendererDir = join(__dirname, "renderer");
    for (const filePath of getAllSourceFiles(rendererDir)) {
      const content = readFileSync(filePath, "utf8");
      expect(content, filePath).not.toMatch(/captcha\s*bypass/i);
      expect(content, filePath).not.toMatch(/from\s+["']@clime\/(event-bus|storage|vault|ai)["']/);
      expect(content, filePath).not.toMatch(/from\s+["']@clime\/notification["']/);
    }
  });
});
