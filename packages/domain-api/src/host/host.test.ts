import { describe, expect, it, vi } from "vitest";
import { SCHEMA_VERSION } from "@clime/shared";
import { createDomainHost } from "./create-host.js";
import { registerDomainIpcHandlers, unregisterDomainIpcHandlers } from "./register-handlers.js";

describe("DomainHost and IPC Registration", () => {
  it("handles valid queries using default handlers", async () => {
    const host = createDomainHost();
    const res = await host.handleIpcRequest("domain:growth.getMissionToday", {
      requestId: "req_1",
      schema_version: SCHEMA_VERSION,
      traceId: "trace_1",
      args: {},
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.requestId).toBe("req_1");
      expect(res.traceId).toBe("trace_1");
      expect(res.data).toHaveProperty("schema_version", SCHEMA_VERSION);
      expect(res.data).toHaveProperty("missions");
    }
  });

  it("handles async commands [A] by returning AsyncJobAck with jobId", async () => {
    const host = createDomainHost();
    const res = await host.handleIpcRequest("domain:automation.startMission", {
      requestId: "req_2",
      schema_version: SCHEMA_VERSION,
      traceId: "trace_2",
      args: { templateId: "tmpl_1" },
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      const ack = res.data as { schema_version: number; jobId: string; traceId: string };
      expect(ack.schema_version).toBe(SCHEMA_VERSION);
      expect(ack.jobId).toMatch(/^job_/);
      expect(ack.traceId).toBe("trace_2");
    }
  });

  it("enforces governance admission checks on Commands", async () => {
    const admitMock = vi.fn().mockResolvedValue({
      ok: false,
      code: "FEATURE_DISABLED",
      message: "Feature feature.content.validate is disabled",
      traceId: "trace_3",
    });

    const host = createDomainHost({
      governanceAPI: {
        admit: admitMock,
      },
    });

    const res = await host.handleIpcRequest("domain:content.validate", {
      requestId: "req_3",
      schema_version: SCHEMA_VERSION,
      traceId: "trace_3",
      args: { artifactId: "art_1" },
    });

    expect(admitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        featureKey: "feature.content.validate",
        traceId: "trace_3",
      }),
    );

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("FEATURE_DISABLED");
      expect(res.error.message).toContain("disabled");
    }
  });

  it("registers and unregisters handlers on IPC main mock", () => {
    const host = createDomainHost();
    const handleMap = new Map<string, (event: unknown, ...args: unknown[]) => Promise<unknown>>();

    const mockIpcMain = {
      handle: vi.fn((channel: string, listener: (event: unknown, ...args: unknown[]) => Promise<unknown>) => {
        handleMap.set(channel, listener);
      }),
      removeHandler: vi.fn((channel: string) => {
        handleMap.delete(channel);
      }),
    };

    registerDomainIpcHandlers(mockIpcMain, host);
    expect(mockIpcMain.handle).toHaveBeenCalled();
    expect(handleMap.has("domain:growth.getMissionToday")).toBe(true);
    expect(handleMap.has("domain:governance.activateKillSwitch")).toBe(true);

    unregisterDomainIpcHandlers(mockIpcMain);
    expect(mockIpcMain.removeHandler).toHaveBeenCalled();
    expect(handleMap.size).toBe(0);
  });
});
