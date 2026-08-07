import { createWorkflowEngine, type WorkflowEngine } from "@clime/workflow";
import {
  DEFAULT_MAX_CONCURRENT_WORKERS,
} from "./constants.js";
import {
  createWorkerGovernor,
  type WorkerGovernor,
} from "./governor.js";
import {
  createOutboxPublisher,
  noopOutboxSink,
  type OutboxDeliverySink,
  type OutboxPublisher,
} from "./outbox-publisher.js";
import {
  createQueueService,
  type AutomationStorage,
  type QueueService,
} from "./queue.js";
import { createWorkerRuntime, type WorkerRuntime } from "./worker.js";

export type AutomationRuntime = {
  storage: AutomationStorage;
  workflow: WorkflowEngine;
  queue: QueueService;
  governor: WorkerGovernor;
  worker: WorkerRuntime;
  outbox: OutboxPublisher;
  /**
   * Mission Center START — enqueue Planner Queue only; return job ack fields.
   * Never leases or advances SM beyond QUEUED create.
   */
  startMission: (input: {
    projectId: string;
    jobId: string;
    traceId: string;
    missionId?: string;
    templateId?: string;
  }) => Promise<{
    schema_version: 1;
    jobId: string;
    traceId: string;
    plannerQueueItemId: string;
    workflowRunId: string;
  }>;
  stop: () => void;
};

export type CreateAutomationRuntimeOptions = {
  storage: AutomationStorage;
  maxConcurrentWorkers?: number;
  outboxSink?: OutboxDeliverySink;
  workerId?: string;
  /** Auto-start outbox publisher loop (default false — caller starts). */
  startOutboxPublisher?: boolean;
};

export function createAutomationRuntime(
  options: CreateAutomationRuntimeOptions,
): AutomationRuntime {
  const workflow = createWorkflowEngine(options.storage);
  const queue = createQueueService(options.storage);
  const governor = createWorkerGovernor(
    options.maxConcurrentWorkers ?? DEFAULT_MAX_CONCURRENT_WORKERS,
  );
  const worker = createWorkerRuntime({
    queue,
    workflow,
    governor,
    workerId: options.workerId,
  });
  const outbox = createOutboxPublisher({
    storage: options.storage,
    sink: options.outboxSink ?? noopOutboxSink,
  });
  if (options.startOutboxPublisher) {
    outbox.start();
  }

  return {
    storage: options.storage,
    workflow,
    queue,
    governor,
    worker,
    outbox,
    async startMission(input) {
      // START → Queue only (B3A §5.2) — never invoke Worker Runtime from IPC.
      return queue.enqueueMission({
        projectId: input.projectId,
        jobId: input.jobId,
        traceId: input.traceId,
        missionId: input.missionId,
        templateId: input.templateId,
      });
    },
    stop() {
      outbox.stop();
    },
  };
}
