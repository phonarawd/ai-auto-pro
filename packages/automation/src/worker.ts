import type { WorkflowEngine } from "@clime/workflow";
import type { WorkerGovernor } from "./governor.js";
import type { QueueService } from "./queue.js";
import { DEFAULT_LEASE_TTL_MS } from "./constants.js";

export type WorkerRuntime = {
  workerId: string;
  /**
   * Pull one ready item under Governor, lease, heartbeat, advance SM stub.
   * Does not run on renderer — caller must be main/node.
   */
  tick: (projectId: string) => Promise<
    | { ok: true; queueItemId: string; workflowRunId?: string; state?: string }
    | {
        ok: false;
        reason: "empty" | "throttled" | "lease_failed" | "error";
        message?: string;
      }
  >;
  getStatus: () => { activeWorkers: number; maxConcurrent: number };
};

export type WorkerRuntimeDeps = {
  queue: QueueService;
  workflow: WorkflowEngine;
  governor: WorkerGovernor;
  workerId?: string;
  leaseTtlMs?: number;
};

/**
 * Worker Runtime — Queue item → lease → Workflow SM slice (B3A §5).
 * Node runners are stubs; Validate-skip remains impossible via WorkflowEngine.
 */
export function createWorkerRuntime(deps: WorkerRuntimeDeps): WorkerRuntime {
  const workerId =
    deps.workerId ?? `worker_${Math.random().toString(36).slice(2, 8)}`;
  const ttl = deps.leaseTtlMs ?? DEFAULT_LEASE_TTL_MS;

  return {
    workerId,

    getStatus() {
      return {
        activeWorkers: deps.governor.getActiveCount(),
        maxConcurrent: deps.governor.maxConcurrent,
      };
    },

    async tick(projectId) {
      const admit = deps.governor.admit();
      if (!admit.ok) {
        return {
          ok: false,
          reason: "throttled",
          message: admit.message,
        };
      }

      const item = await deps.queue.leaseNext(projectId, workerId, ttl);
      if (!item) {
        return { ok: false, reason: "empty" };
      }

      deps.governor.acquire();
      try {
        await deps.queue.heartbeat(item.id, workerId, ttl);

        const runs = await deps.workflow.listRuns(projectId, 200);
        let run = runs.find((r) => r.queueItemId === item.id) ?? null;

        if (!run) {
          const created = await deps.workflow.createRun({
            projectId,
            templateId: "daily-growth",
            queueItemId: item.id,
            missionId: item.missionId,
            traceId: item.id,
          });
          if (!created.ok) {
            await deps.queue.failItem(item.id);
            deps.governor.release();
            return {
              ok: false,
              reason: "error",
              message: created.errors.join("; "),
            };
          }
          run = await deps.workflow.getRun(created.workflowRunId);
        }

        if (!run) {
          deps.governor.release();
          return { ok: false, reason: "error", message: "missing workflow run" };
        }

        // Stub Agent Loop slice: QUEUED→RUNNING→VALIDATING (Validate not skipped).
        // Full Generate/Validate/Publish engines = C1/C2.
        if (run.state === "QUEUED") {
          const toRunning = await deps.workflow.transition({
            workflowRunId: run.id,
            to: "RUNNING",
            traceId: run.traceId,
          });
          if (!toRunning.ok) {
            await deps.workflow.stopOnPartialFailure({
              workflowRunId: run.id,
              nodeId: "start",
              error: toRunning.message,
              traceId: toRunning.traceId,
            });
            await deps.queue.failItem(item.id);
            deps.governor.release();
            return {
              ok: false,
              reason: "error",
              message: toRunning.message,
            };
          }
          await deps.queue.heartbeat(item.id, workerId, ttl);
          await deps.workflow.transition({
            workflowRunId: run.id,
            to: "VALIDATING",
            traceId: run.traceId,
          });
        }

        const after = await deps.workflow.getRun(run.id);
        await deps.queue.completeItem(item.id);
        deps.governor.release();
        return {
          ok: true,
          queueItemId: item.id,
          workflowRunId: run.id,
          state: after?.state,
        };
      } catch (err) {
        deps.governor.release();
        return {
          ok: false,
          reason: "error",
          message: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}
