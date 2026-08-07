import { describe, expect, it } from "vitest";
import { withSchemaVersion } from "@clime/shared";
import {
  createAndSeedSqliteStorage,
  SEED_IDS,
} from "@clime/storage";
import {
  createAutomationRuntime,
  createWorkerGovernor,
  DEFAULT_MAX_CONCURRENT_WORKERS,
} from "./index.js";

describe("@clime/automation Queue + Workers + Outbox", () => {
  it("startMission enqueues Planner Queue and does not lease/run inline", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const runtime = createAutomationRuntime({ storage });
      const ack = await runtime.startMission({
        projectId: SEED_IDS.emptyProject,
        jobId: "job_start_1",
        traceId: "tr_start_1",
        missionId: "mission-1",
      });

      expect(ack.plannerQueueItemId).toBeTruthy();
      expect(ack.workflowRunId).toBeTruthy();

      const item = await storage.plannerQueue.getById(ack.plannerQueueItemId);
      expect(item?.status).toBe("ready");
      expect(item?.leasedBy).toBeNull();

      const run = await storage.workflowRuns.getById(ack.workflowRunId);
      expect(run?.state).toBe("QUEUED");
      expect(run?.queueItemId).toBe(ack.plannerQueueItemId);

      // START path must not advance SM past QUEUED
      expect(runtime.governor.getActiveCount()).toBe(0);
    } finally {
      storage.close();
    }
  });

  it("worker leases under Governor; overload throttles", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const runtime = createAutomationRuntime({
        storage,
        maxConcurrentWorkers: 2,
      });
      expect(runtime.governor.maxConcurrent).toBe(2);
      expect(DEFAULT_MAX_CONCURRENT_WORKERS).toBe(3);

      for (let i = 0; i < 3; i++) {
        await runtime.startMission({
          projectId: SEED_IDS.emptyProject,
          jobId: `job_${i}`,
          traceId: `tr_${i}`,
        });
      }

      const t1 = await runtime.worker.tick(SEED_IDS.emptyProject);
      const t2 = await runtime.worker.tick(SEED_IDS.emptyProject);
      expect(t1.ok).toBe(true);
      expect(t2.ok).toBe(true);

      // Both released after tick completes — admit should work again.
      // Force acquire slots to prove throttle:
      const gov = createWorkerGovernor(2);
      gov.acquire();
      gov.acquire();
      const denied = gov.admit();
      expect(denied.ok).toBe(false);
      if (!denied.ok) expect(denied.code).toBe("GOVERNOR_THROTTLED");
    } finally {
      storage.close();
    }
  });

  it("lease expiry reclaim restores ready (zombie reclaim)", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const runtime = createAutomationRuntime({ storage });
      const ack = await runtime.startMission({
        projectId: SEED_IDS.emptyProject,
        jobId: "job_lease",
        traceId: "tr_lease",
      });

      const past = new Date(Date.now() - 60_000).toISOString();
      const leased = await storage.plannerQueue.lease(
        ack.plannerQueueItemId,
        "zombie-worker",
        past,
        past, // already expired
      );
      expect(leased).toBe(true);

      const reclaimed = await runtime.queue.reclaimExpired(
        new Date().toISOString(),
      );
      expect(reclaimed).toContain(ack.plannerQueueItemId);

      const item = await storage.plannerQueue.getById(ack.plannerQueueItemId);
      expect(item?.status).toBe("ready");
      expect(item?.leasedBy).toBeNull();
      expect(item?.leaseExpiresAt).toBeNull();
    } finally {
      storage.close();
    }
  });

  it("heartbeat extends lease_expires_at", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const runtime = createAutomationRuntime({ storage });
      const ack = await runtime.startMission({
        projectId: SEED_IDS.emptyProject,
        jobId: "job_hb",
        traceId: "tr_hb",
      });
      const at = new Date().toISOString();
      const firstExpiry = new Date(Date.now() + 5_000).toISOString();
      await storage.plannerQueue.lease(
        ack.plannerQueueItemId,
        "w-hb",
        at,
        firstExpiry,
      );
      const extended = new Date(Date.now() + 30_000).toISOString();
      expect(
        await runtime.queue.heartbeat(ack.plannerQueueItemId, "w-hb", 30_000),
      ).toBe(true);
      const item = await storage.plannerQueue.getById(ack.plannerQueueItemId);
      expect(item?.leaseExpiresAt).toBeTruthy();
      expect(item!.leaseExpiresAt! > firstExpiry || item!.leaseExpiresAt === extended).toBe(
        true,
      );
    } finally {
      storage.close();
    }
  });

  it("outbox publisher drains pending → published", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const delivered: string[] = [];
      const runtime = createAutomationRuntime({
        storage,
        outboxSink: {
          async deliver(row) {
            delivered.push(row.id);
          },
        },
      });

      await storage.eventOutbox.enqueue({
        projectId: SEED_IDS.emptyProject,
        type: "domain.test",
        payloadJson: JSON.stringify(withSchemaVersion({ ok: true })),
        traceId: "tr_out",
        occurredAt: new Date().toISOString(),
        status: "pending",
      });

      const result = await runtime.outbox.tick();
      expect(result.published).toBe(1);
      expect(delivered).toHaveLength(1);
      const pending = await storage.eventOutbox.listPending(10);
      expect(pending).toHaveLength(0);
    } finally {
      storage.close();
    }
  });

  it("worker advances SM through VALIDATING (no validate skip)", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const runtime = createAutomationRuntime({ storage });
      const ack = await runtime.startMission({
        projectId: SEED_IDS.emptyProject,
        jobId: "job_sm",
        traceId: "tr_sm",
      });

      const tick = await runtime.worker.tick(SEED_IDS.emptyProject);
      expect(tick.ok).toBe(true);
      if (!tick.ok) throw new Error("tick failed");

      const run = await storage.workflowRuns.getById(ack.workflowRunId);
      expect(run?.state).toBe("VALIDATING");
      expect(run?.state).not.toBe("PUBLISHED");
      expect(run?.state).not.toBe("OPTIMIZING");
    } finally {
      storage.close();
    }
  });

  it("queue bypass count = 0: startMission always creates ready queue item", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const runtime = createAutomationRuntime({ storage });
      const before = await storage.plannerQueue.listByProject(
        SEED_IDS.emptyProject,
        100,
      );
      await runtime.startMission({
        projectId: SEED_IDS.emptyProject,
        jobId: "job_bypass_check",
        traceId: "tr_bypass",
      });
      const after = await storage.plannerQueue.listByProject(
        SEED_IDS.emptyProject,
        100,
      );
      expect(after.length - before.length).toBe(1);
      expect(after.some((i) => i.status === "ready")).toBe(true);
    } finally {
      storage.close();
    }
  });
});
