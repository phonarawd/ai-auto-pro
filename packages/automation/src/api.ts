import type { AutomationRuntime } from "./runtime.js";

type ArgRecord = Record<string, unknown>;

type DomainHandler = (
  args: ArgRecord,
  context: {
    requestId: string;
    traceId: string;
    projectId?: string | null;
  },
) => Promise<unknown>;

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export type StartMissionJobFactory = () => string;

/**
 * AutomationAPI handlers — B3A §6.2.
 * `startMission` enqueues Planner Queue and returns jobId — never bypasses Queue.
 */
export function createAutomationApiHandlers(
  runtime: AutomationRuntime,
  options: {
    generateJobId: StartMissionJobFactory;
    defaultProjectId: string;
    /** Optional side-effect after enqueue (e.g. Domain PlannerItemEnqueued → Inbox). */
    onEnqueued?: (ack: {
      jobId: string;
      traceId: string;
      plannerQueueItemId: string;
      missionId?: string;
    }) => Promise<void>;
  },
) {
  return {
    "automation.startMission": async (
      args: { missionId?: string; templateId?: string; projectId?: string },
      ctx: { traceId: string; projectId?: string | null },
    ) => {
      const jobId = options.generateJobId();
      const projectId =
        args.projectId ?? ctx.projectId ?? options.defaultProjectId;
      const ack = await runtime.startMission({
        projectId,
        jobId,
        traceId: ctx.traceId,
        missionId: args.missionId,
        templateId: args.templateId,
      });
      await options.onEnqueued?.({
        jobId: ack.jobId,
        traceId: ack.traceId,
        plannerQueueItemId: ack.plannerQueueItemId,
        missionId: args.missionId,
      });
      return {
        schema_version: 1 as const,
        jobId: ack.jobId,
        traceId: ack.traceId,
        accepted: true as const,
        plannerQueueItemId: ack.plannerQueueItemId,
      };
    },

    "automation.getQueueDepth": async (
      args: { projectId?: string },
      ctx: { projectId?: string | null },
    ) => {
      const projectId =
        args.projectId ?? ctx.projectId ?? options.defaultProjectId;
      const depth = await runtime.queue.getQueueDepth(projectId);
      return { schema_version: 1 as const, depth };
    },

    "automation.getWorkerStatus": async () => {
      const status = runtime.worker.getStatus();
      return {
        schema_version: 1 as const,
        activeWorkers: status.activeWorkers,
        maxConcurrent: status.maxConcurrent,
      };
    },

    "automation.listQueue": async (
      args: { projectId?: string },
      ctx: { projectId?: string | null },
    ) => {
      const projectId =
        args.projectId ?? ctx.projectId ?? options.defaultProjectId;
      return runtime.queue.listQueue(projectId);
    },

    "automation.cancelJob": async (
      args: { jobId: string; projectId?: string },
      ctx: { traceId: string; projectId?: string | null },
    ) => {
      const projectId =
        args.projectId ?? ctx.projectId ?? options.defaultProjectId;
      const result = await runtime.queue.cancelJob({
        jobId: args.jobId,
        projectId,
        traceId: ctx.traceId,
      });
      return {
        schema_version: 1 as const,
        jobId: args.jobId,
        terminalState: "CANCELLED" as const,
        cancelled: result.cancelled,
      };
    },
  };
}

export function createAutomationDomainHandlers(
  runtime: AutomationRuntime,
  options: {
    generateJobId: StartMissionJobFactory;
    defaultProjectId: string;
    onEnqueued?: (ack: {
      jobId: string;
      traceId: string;
      plannerQueueItemId: string;
      missionId?: string;
    }) => Promise<void>;
  },
): Record<string, DomainHandler> {
  const api = createAutomationApiHandlers(runtime, options);

  return {
    "automation.startMission": async (args, ctx) =>
      api["automation.startMission"](
        {
          missionId:
            typeof args.missionId === "string" ? args.missionId : undefined,
          templateId:
            typeof args.templateId === "string" ? args.templateId : undefined,
          projectId:
            typeof args.projectId === "string" ? args.projectId : undefined,
        },
        ctx,
      ),

    "automation.getQueueDepth": async (args, ctx) =>
      api["automation.getQueueDepth"](
        {
          projectId:
            typeof args.projectId === "string" ? args.projectId : undefined,
        },
        ctx,
      ),

    "automation.getWorkerStatus": async () => api["automation.getWorkerStatus"](),

    "automation.listQueue": async (args, ctx) =>
      api["automation.listQueue"](
        {
          projectId:
            typeof args.projectId === "string" ? args.projectId : undefined,
        },
        ctx,
      ),

    "automation.cancelJob": async (args, ctx) =>
      api["automation.cancelJob"](
        {
          jobId: asString(args.jobId),
          projectId:
            typeof args.projectId === "string" ? args.projectId : undefined,
        },
        ctx,
      ),
  };
}
