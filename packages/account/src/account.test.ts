import { describe, expect, it, vi } from "vitest";
import { createAccountManager } from "./manager.js";
import { createAccountApiHandlers } from "./api.js";
import { HONEST_MATRIX_NOTICE } from "./matrix.js";

describe("Account Manager & Domain API", () => {
  it("connects account and computes honest capability matrix", () => {
    const manager = createAccountManager();
    const account = manager.connectAccount({
      projectId: "proj_1",
      platform: "naver",
      accountName: "Naver Official Blog",
      authMode: "session",
    });

    expect(account.id).toBeDefined();
    expect(account.platform).toBe("naver");

    const matrix = manager.getCapabilityMatrix(account.id, "naver");
    expect(matrix.canPublish).toBe(true);
    expect(matrix.publishMode).toBe("session");
    expect(matrix.riskLevel).toBe("medium");
    expect(matrix.notice).toContain(HONEST_MATRIX_NOTICE);
  });

  it("routes campaign targets by tag", () => {
    const manager = createAccountManager();
    const mainAcc = manager.connectAccount({
      projectId: "proj_1",
      platform: "instagram",
      accountName: "IG Main Official",
      authMode: "oauth",
      metadata: { isPrimary: true },
    });
    const subAcc = manager.connectAccount({
      projectId: "proj_1",
      platform: "instagram",
      accountName: "IG Event Sub",
      authMode: "oauth",
      metadata: { isPrimary: false },
    });

    const brandRoute = manager.route({
      projectId: "proj_1",
      channel: "instagram",
      campaignTag: "브랜드",
    });
    expect(brandRoute.targetAccount).toBe(mainAcc.id);

    const eventRoute = manager.route({
      projectId: "proj_1",
      channel: "instagram",
      campaignTag: "이벤트",
    });
    expect(eventRoute.targetAccount).toBe(subAcc.id);
  });

  it("triggers challenge auto-pause and doctor diagnosis", () => {
    const manager = createAccountManager();
    const eventBusMock = { emit: vi.fn() };

    const acc = manager.connectAccount({
      projectId: "proj_1",
      platform: "naver",
      accountName: "Naver Blog",
      authMode: "session",
    });

    manager.setHealthState(
      {
        accountId: acc.id,
        platform: "naver",
        status: "challenge",
        reason: "Captcha challenge encountered during auto-publish",
        checkedAt: new Date().toISOString(),
      },
      eventBusMock
    );

    expect(eventBusMock.emit).toHaveBeenCalledWith(
      "PublishChallengeDetected",
      expect.objectContaining({
        accountId: acc.id,
        platform: "naver",
      })
    );
    expect(eventBusMock.emit).toHaveBeenCalledWith(
      "PublishAutoPaused",
      expect.objectContaining({
        accountId: acc.id,
        platform: "naver",
      })
    );

    const matrix = manager.getCapabilityMatrix(acc.id, "naver");
    expect(matrix.canPublish).toBe(false);
    expect(matrix.notice).toContain("자동 일시정지됨");

    const diagnosis = manager.diagnoseError("CAPTCHA required for login");
    expect(diagnosis.errorCode).toBe("CHALLENGE_REQUIRED");
    expect(diagnosis.autoPauseTriggered).toBe(true);
  });

  it("runs sandbox test without attempting real posts", async () => {
    const manager = createAccountManager();
    const acc = manager.connectAccount({
      projectId: "proj_1",
      platform: "instagram",
      accountName: "IG Business",
      authMode: "oauth",
    });

    const sandbox = await manager.runSandbox(acc.id, "instagram");
    expect(sandbox.success).toBe(true);
    expect(sandbox.logs.some((l) => l.includes("Read profile capability test passed"))).toBe(
      true
    );
  });

  it("handles Domain API endpoints via createAccountApiHandlers", async () => {
    const manager = createAccountManager();
    const handlers = createAccountApiHandlers(manager);

    const acc = await handlers["account.connect"]({
      projectId: "proj_1",
      platform: "x",
      accountName: "X Brand Handle",
      authMode: "oauth",
    });

    const list = await handlers["account.listAccounts"]({ projectId: "proj_1" });
    expect(list.length).toBe(1);

    const matrix = await handlers["account.getMatrix"]({ accountId: acc.id, platform: "x" });
    expect(matrix.canPublish).toBe(true);
    expect(matrix.publishMode).toBe("api");
    expect(matrix.platforms.length).toBeGreaterThanOrEqual(6);

    const importRes = await handlers["account.importUrl"]({
      url: "https://blog.naver.com/sample",
      platform: "naver",
    });
    expect(importRes.schema_version).toBe(1);

    const pauseRes = await handlers["account.pausePublish"]({
      accountId: acc.id,
      reason: "Manual pause request",
    });
    expect(pauseRes.paused).toBe(true);
    expect(pauseRes.healthState.platform).toBe("x");

    const resumeRes = await handlers["account.resumePublish"]({
      accountId: acc.id,
    });
    expect(resumeRes.resumed).toBe(true);
  });

  it("returns honest Matrix when no accounts are connected", async () => {
    const manager = createAccountManager();
    const handlers = createAccountApiHandlers(manager);
    const matrix = await handlers["account.getMatrix"]({});
    expect(matrix.canPublish).toBe(false);
    expect(matrix.riskLevel).toBe("high");
    expect(matrix.notice).toContain("연결된 계정 없음");
    expect(matrix.platforms.some((p) => p.id === "naver")).toBe(true);
  });
});
