import { describe, expect, it, vi } from "vitest";
import { SCHEMA_VERSION } from "@clime/shared";
import { bootstrapDesktopDomainApi } from "./main/bootstrap-domain-api.js";

describe("B3-D Queue Prove (desktop wiring)", () => {
  it("START → real Planner Queue item (bypass 0) + jobId ack", async () => {
    const ipcMain = { handle: vi.fn() };
    const boot = bootstrapDesktopDomainApi(ipcMain);
    try {
      const res = await boot.host.handleIpcRequest(
        "domain:automation.startMission",
        {
          requestId: "req_b3d",
          schema_version: SCHEMA_VERSION,
          traceId: "tr_b3d_start",
          args: { missionId: "mission-b3" },
        },
      );
      expect(res.ok).toBe(true);
      if (!res.ok) throw new Error("expected startMission ok");
      const data = res.data as {
        jobId: string;
        traceId: string;
        plannerQueueItemId?: string;
      };
      expect(data.jobId).toMatch(/^job_/);
      expect(data.plannerQueueItemId).toBeTruthy();

      const item = await boot.storage.plannerQueue.getById(
        data.plannerQueueItemId!,
      );
      expect(item?.status).toBe("ready");
      expect(item?.leasedBy).toBeNull();

      // START must not have run the worker inline
      expect(boot.automation.governor.getActiveCount()).toBe(0);

      await Promise.resolve();
      await Promise.resolve();
      const enqueued = boot.notificationManager
        .listInbox()
        .find((i) => i.kind === "job.enqueued");
      expect(enqueued?.jobId).toBe(data.jobId);
    } finally {
      await boot.close();
    }
  });

  it("Governor maxConcurrent ≤ 3 on wired runtime", async () => {
    const ipcMain = { handle: vi.fn() };
    const boot = bootstrapDesktopDomainApi(ipcMain);
    try {
      expect(boot.automation.governor.maxConcurrent).toBeLessThanOrEqual(3);
      expect(boot.automation.governor.maxConcurrent).toBeGreaterThanOrEqual(2);
    } finally {
      await boot.close();
    }
  });
});
