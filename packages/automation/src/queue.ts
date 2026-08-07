import { SCHEMA_VERSION, withSchemaVersion } from "@clime/shared";
import type { ClimeStorage, PlannerQueueItemRow } from "@clime/storage";
import {
  createDailyGrowthDsl,
  DAILY_GROWTH_TEMPLATE_ID,
} from "@clime/workflow";
import { DEFAULT_LEASE_TTL_MS } from "./constants.js";

export type AutomationStorage = Pick<
  ClimeStorage,
  "plannerQueue" | "workflowRuns" | "eventOutbox" | "projects"
>;

export type EnqueueMissionInput = {
  projectId: string;
  jobId: string;
  traceId: string;
  missionId?: string;
  templateId?: string;
  priority?: number;
};

export type EnqueueMissionResult = {
  schema_version: 1;
  jobId: string;
  traceId: string;
  plannerQueueItemId: string;
  workflowRunId: string;
};

function leaseExpiry(fromMs = Date.now(), ttlMs = DEFAULT_LEASE_TTL_MS): string {
  return new Date(fromMs + ttlMs).toISOString();
}

export function createQueueService(storage: AutomationStorage) {
  return {
    async enqueueMission(input: EnqueueMissionInput): Promise<EnqueueMissionResult> {
      const templateId = input.templateId ?? DAILY_GROWTH_TEMPLATE_ID;
      const payload = withSchemaVersion({
        kind: "mission.start",
        jobId: input.jobId,
        missionId: input.missionId,
        templateId,
        traceId: input.traceId,
      });

      const { id: plannerQueueItemId } = await storage.plannerQueue.enqueue({
        projectId: input.projectId,
        priority: input.priority ?? 100,
        deadline: null,
        expectedRoi: null,
        dependencyIdsJson: JSON.stringify(
          withSchemaVersion({ ids: [] as string[] }),
        ),
        retryCount: 0,
        humanApproval: 0,
        decisionId: null,
        missionId: input.missionId ?? null,
        payloadJson: JSON.stringify(payload),
        status: "ready",
        leasedBy: null,
        leasedAt: null,
        leaseExpiresAt: null,
      });

      // WorkflowRun QUEUED linked to queue item — still Queue-first; no lease/run here.
      const dsl =
        templateId === DAILY_GROWTH_TEMPLATE_ID
          ? createDailyGrowthDsl()
          : createDailyGrowthDsl();
      const { id: workflowRunId } = await storage.workflowRuns.create({
        projectId: input.projectId,
        queueItemId: plannerQueueItemId,
        missionId: input.missionId ?? null,
        decisionId: null,
        dslJson: JSON.stringify(dsl),
        state: "QUEUED",
        cursorJson: null,
        traceId: input.traceId,
      });

      return {
        schema_version: SCHEMA_VERSION,
        jobId: input.jobId,
        traceId: input.traceId,
        plannerQueueItemId,
        workflowRunId,
      };
    },

    async getQueueDepth(projectId: string): Promise<number> {
      const items = await storage.plannerQueue.listByProject(projectId, 5000);
      return items.filter((i) => i.status === "ready" || i.status === "leased")
        .length;
    },

    async listQueue(
      projectId: string,
      limit = 100,
    ): Promise<PlannerQueueItemRow[]> {
      return storage.plannerQueue.listByProject(projectId, limit);
    },

    async leaseNext(
      projectId: string,
      workerId: string,
      ttlMs = DEFAULT_LEASE_TTL_MS,
    ): Promise<PlannerQueueItemRow | null> {
      await storage.plannerQueue.reclaimExpired(new Date().toISOString());
      const ready = await storage.plannerQueue.listReady(projectId, 1);
      const item = ready[0];
      if (!item) return null;
      const at = new Date().toISOString();
      const ok = await storage.plannerQueue.lease(
        item.id,
        workerId,
        at,
        leaseExpiry(Date.now(), ttlMs),
      );
      if (!ok) return null;
      return storage.plannerQueue.getById(item.id);
    },

    async heartbeat(
      itemId: string,
      workerId: string,
      ttlMs = DEFAULT_LEASE_TTL_MS,
    ): Promise<boolean> {
      return storage.plannerQueue.heartbeat(
        itemId,
        workerId,
        leaseExpiry(Date.now(), ttlMs),
      );
    },

    reclaimExpired(now = new Date().toISOString()) {
      return storage.plannerQueue.reclaimExpired(now);
    },

    completeItem(id: string) {
      return storage.plannerQueue.updateStatus(id, "completed");
    },

    failItem(id: string) {
      return storage.plannerQueue.updateStatus(id, "failed");
    },

    async cancelJob(input: {
      jobId: string;
      projectId: string;
      traceId: string;
    }): Promise<{ cancelled: boolean; queueItemId?: string; workflowRunId?: string }> {
      const items = await storage.plannerQueue.listByProject(input.projectId, 2000);
      const match = items.find((i) => {
        try {
          const payload = JSON.parse(i.payloadJson) as { jobId?: string };
          return payload.jobId === input.jobId;
        } catch {
          return false;
        }
      });
      if (!match) return { cancelled: false };

      await storage.plannerQueue.updateStatus(match.id, "cancelled");
      const runs = await storage.workflowRuns.listByProject(input.projectId, 2000);
      const run = runs.find((r) => r.queueItemId === match.id);
      if (run && run.state !== "CANCELLED" && run.state !== "PUBLISHED") {
        await storage.workflowRuns.transition(run.id, "CANCELLED");
      }
      return {
        cancelled: true,
        queueItemId: match.id,
        workflowRunId: run?.id,
      };
    },
  };
}

export type QueueService = ReturnType<typeof createQueueService>;
