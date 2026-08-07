import { describe, expect, it, vi } from "vitest";
import { SCHEMA_VERSION } from "@clime/shared";
import { bootstrapDesktopDomainApi } from "./main/bootstrap-domain-api.js";

describe("C2-D desktop publish wiring", () => {
  it("account.publish is registered; Matrix + API path → posted_api", async () => {
    const ipcMain = { handle: vi.fn() };
    const boot = bootstrapDesktopDomainApi(ipcMain);
    try {
      await boot.storage.seedDefaults();

      const matrixRes = await boot.host.handleIpcRequest("domain:account.getMatrix", {
        requestId: "req_c2_m",
        schema_version: SCHEMA_VERSION,
        traceId: "tr_c2_m",
        args: {},
      });
      expect(matrixRes.ok).toBe(true);
      if (!matrixRes.ok) throw new Error("matrix");
      expect((matrixRes.data as { canPublish: boolean }).canPublish).toBe(false);

      const connectRes = await boot.host.handleIpcRequest("domain:account.connect", {
        requestId: "req_c2_c",
        schema_version: SCHEMA_VERSION,
        traceId: "tr_c2_c",
        args: {
          projectId: "seed_project_empty",
          platform: "x",
          accountName: "x-main",
          authMode: "oauth",
        },
      });
      expect(connectRes.ok).toBe(true);
      if (!connectRes.ok) throw new Error("connect");
      const accountId = (connectRes.data as { id: string }).id;
      expect(accountId).toBeTruthy();

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
          body: "Publish me",
          title: "T",
        }),
      });

      const pub = await boot.host.handleIpcRequest("domain:account.publish", {
        requestId: "req_c2_p",
        schema_version: SCHEMA_VERSION,
        traceId: "tr_c2_p",
        args: {
          projectId: "seed_project_empty",
          contentItemId: produced.id,
          accountId,
          platform: "x",
          skipJitter: true,
        },
      });
      expect(pub.ok).toBe(true);
      if (!pub.ok) throw new Error(`publish ipc fail: ${JSON.stringify(pub)}`);
      const data = pub.data as {
        ok: boolean;
        historyKind: string;
        publishMode: string;
        jobId: string;
      };
      expect(data.jobId).toMatch(/^job_/);
      expect(data.ok).toBe(true);
      expect(data.historyKind).toBe("posted_api");
      expect(data.publishMode).toBe("api");

      const history = await boot.storage.content.listHistory(
        "seed_project_empty",
        20,
      );
      expect(history.some((h) => h.kind === "posted_api")).toBe(true);
    } finally {
      await boot.close();
    }
  });

  it("session challenge → PAUSED_CHALLENGE + Inbox (no posted_session)", async () => {
    const ipcMain = { handle: vi.fn() };
    const boot = bootstrapDesktopDomainApi(ipcMain);
    try {
      await boot.storage.seedDefaults();

      const connectRes = await boot.host.handleIpcRequest("domain:account.connect", {
        requestId: "req_c2_s",
        schema_version: SCHEMA_VERSION,
        traceId: "tr_c2_s",
        args: {
          projectId: "seed_project_empty",
          platform: "naver",
          accountName: "blog",
          authMode: "session",
        },
      });
      expect(connectRes.ok).toBe(true);
      if (!connectRes.ok) throw new Error("connect");
      const accountId = (connectRes.data as { id: string }).id;

      await boot.host.handleIpcRequest("domain:account.pausePublish", {
        requestId: "req_c2_pause",
        schema_version: SCHEMA_VERSION,
        traceId: "tr_c2_pause",
        args: { accountId, reason: "Captcha challenge" },
      });
      await boot.accountEventBus.flush();

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
          body: "Session post",
        }),
      });

      const pub = await boot.host.handleIpcRequest("domain:account.publish", {
        requestId: "req_c2_sp",
        schema_version: SCHEMA_VERSION,
        traceId: "tr_c2_sp",
        args: {
          projectId: "seed_project_empty",
          contentItemId: produced.id,
          accountId,
          platform: "naver",
          skipJitter: true,
        },
      });
      expect(pub.ok).toBe(true);
      if (!pub.ok) throw new Error("publish");
      const data = pub.data as { ok: boolean; code?: string; jobId?: string };
      expect(data.jobId).toMatch(/^job_/);
      expect(data.ok).toBe(false);
      expect(data.code).toBe("BLOCKED_CAPABILITY");

      const history = await boot.storage.content.listHistory(
        "seed_project_empty",
        20,
      );
      expect(history.some((h) => h.kind === "posted_session")).toBe(false);

      const inbox = boot.notificationManager.listInbox();
      expect(inbox.some((i) => i.terminalState === "PAUSED_CHALLENGE")).toBe(true);
    } finally {
      await boot.close();
    }
  });
});
