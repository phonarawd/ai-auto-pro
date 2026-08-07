import { describe, expect, it, vi } from "vitest";
import { SCHEMA_VERSION } from "@clime/shared";
import { createPreloadDomainClient, exposeDomainClientInPreload } from "./preload-bridge.js";

describe("Preload Bridge Allowlist Security", () => {
  it("executes domain:* channels via ipcRenderer.invoke", async () => {
    const mockIpcRenderer = {
      invoke: vi.fn().mockResolvedValue({
        requestId: "req_1",
        ok: true,
        traceId: "trace_1",
        data: { schema_version: SCHEMA_VERSION, canPublish: true, publishMode: "api", riskLevel: "low" },
      }),
    };

    const client = createPreloadDomainClient(mockIpcRenderer);
    const matrix = await client.account.getMatrix();

    expect(matrix.canPublish).toBe(true);
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
      "domain:account.getMatrix",
      expect.objectContaining({
        schema_version: SCHEMA_VERSION,
      }),
    );
  });

  it("exposes domainClient in main world via contextBridge without exposing raw ipcRenderer", () => {
    const mockIpcRenderer = {
      invoke: vi.fn(),
    };
    const exposedObjects = new Map<string, unknown>();

    const mockContextBridge = {
      exposeInMainWorld: vi.fn((key: string, api: unknown) => {
        exposedObjects.set(key, api);
      }),
    };

    exposeDomainClientInPreload(mockContextBridge, mockIpcRenderer);

    expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith("domainClient", expect.anything());
    const domainClient = exposedObjects.get("domainClient") as Record<string, unknown> | undefined;

    expect(domainClient).toBeDefined();
    expect(domainClient?.growth).toBeDefined();
    expect(domainClient?.automation).toBeDefined();
    expect(domainClient?.ipcRenderer).toBeUndefined();
    expect(domainClient?.require).toBeUndefined();
  });
});
