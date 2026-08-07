import { describe, expect, it, vi } from "vitest";
import { SCHEMA_VERSION } from "@clime/shared";
import { bootstrapDesktopDomainApi } from "./main/bootstrap-domain-api.js";
import { DOMAIN_CLIENT_GLOBAL, setupDesktopPreload } from "./preload/setup-preload.js";

describe("Desktop preload/main skeleton", () => {
  it("registers domain:* IPC handlers on main bootstrap", async () => {
    const channels: string[] = [];
    const ipcMain = {
      handle: vi.fn((channel: string) => {
        channels.push(channel);
      }),
    };

    const boot = bootstrapDesktopDomainApi(ipcMain);
    try {
      const { host, observability, accountManager, notificationManager } = boot;

      expect(host).toBeDefined();
      expect(observability).toBeDefined();
      expect(accountManager).toBeDefined();
      expect(notificationManager).toBeDefined();
      expect(channels.some((c) => c === "domain:growth.getMissionToday")).toBe(true);
      expect(channels.some((c) => c === "domain:automation.startMission")).toBe(true);
      expect(channels.some((c) => c === "domain:account.getMatrix")).toBe(true);
      expect(channels.some((c) => c === "domain:notification.listInbox")).toBe(true);
      expect(channels.every((c) => c.startsWith("domain:"))).toBe(true);
    } finally {
      await boot.close();
    }
  });

  it("wires honest Account Matrix (no fake canPublish when disconnected)", async () => {
    const ipcMain = { handle: vi.fn() };
    const boot = bootstrapDesktopDomainApi(ipcMain);
    try {
      const { host, accountManager } = boot;

      const emptyRes = await host.handleIpcRequest("domain:account.getMatrix", {
        requestId: "req_matrix_1",
        schema_version: SCHEMA_VERSION,
        traceId: "tr_matrix_1",
        args: {},
      });
      expect(emptyRes.ok).toBe(true);
      if (!emptyRes.ok) throw new Error("expected ok matrix response");
      const emptyData = emptyRes.data as {
        canPublish: boolean;
        riskLevel: string;
        notice: string;
        platforms: Array<{ id: string }>;
      };
      expect(emptyData.canPublish).toBe(false);
      expect(emptyData.riskLevel).toBe("high");
      expect(emptyData.notice).toContain("연결된 계정 없음");
      expect(emptyData.platforms.length).toBeGreaterThanOrEqual(6);

      accountManager.connectAccount({
        projectId: "default-project",
        platform: "instagram",
        accountName: "IG Official",
        authMode: "oauth",
        metadata: { isPrimary: true },
      });

      const connectedRes = await host.handleIpcRequest("domain:account.getMatrix", {
        requestId: "req_matrix_2",
        schema_version: SCHEMA_VERSION,
        traceId: "tr_matrix_2",
        args: {},
      });
      expect(connectedRes.ok).toBe(true);
      if (!connectedRes.ok) throw new Error("expected ok connected matrix response");
      const connectedData = connectedRes.data as {
        canPublish: boolean;
        publishMode: string;
        riskLevel: string;
      };
      expect(connectedData.canPublish).toBe(true);
      expect(connectedData.publishMode).toBe("api");
      expect(connectedData.riskLevel).toBe("low");
    } finally {
      await boot.close();
    }
  });

  it("exposes domainClient only — no ipcRenderer or bus APIs on window bridge", () => {
    const exposed = new Map<string, unknown>();
    const contextBridge = {
      exposeInMainWorld: vi.fn((key: string, api: unknown) => {
        exposed.set(key, api);
      }),
    };
    const ipcRenderer = {
      invoke: vi.fn(),
    };

    setupDesktopPreload(contextBridge, ipcRenderer);

    expect(contextBridge.exposeInMainWorld).toHaveBeenCalledWith(
      DOMAIN_CLIENT_GLOBAL,
      expect.anything(),
    );

    const domainClient = exposed.get(DOMAIN_CLIENT_GLOBAL) as Record<string, unknown>;
    expect(domainClient).toBeDefined();
    expect(domainClient.growth).toBeDefined();
    expect(domainClient.ipcRenderer).toBeUndefined();
    expect(domainClient.subscribe).toBeUndefined();
    expect(domainClient.on).toBeUndefined();
  });
});
