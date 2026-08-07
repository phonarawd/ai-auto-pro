import type { FeatureManagementStorage } from "../persist/ports.js";
import { isTerminalTaskState } from "../runtime/governor.js";

const CANCEL_QUEUE_STATUSES = new Set(["leased", "ready", "running"]);

export type CancelWorkResult = {
  cancelledWorkflowRunIds: string[];
  cancelledQueueItemIds: string[];
};

/**
 * Cancel non-terminal WorkflowRuns + leased/ready queue items for project(s).
 */
export async function cancelLeasedWork(
  storage: FeatureManagementStorage,
  projectId?: string | null,
): Promise<CancelWorkResult> {
  const projectIds: string[] = [];
  if (projectId) {
    projectIds.push(projectId);
  } else {
    const projects = await storage.projects.list();
    projectIds.push(...projects.map((p) => p.id));
  }

  const cancelledWorkflowRunIds: string[] = [];
  const cancelledQueueItemIds: string[] = [];

  for (const pid of projectIds) {
    const runs = await storage.workflowRuns.listByProject(pid, 2000);
    for (const run of runs) {
      if (isTerminalTaskState(run.state)) continue;
      await storage.workflowRuns.transition(run.id, "CANCELLED");
      cancelledWorkflowRunIds.push(run.id);
    }

    const items = await storage.plannerQueue.listByProject(pid, 2000);
    for (const item of items) {
      if (!CANCEL_QUEUE_STATUSES.has(item.status)) continue;
      await storage.plannerQueue.updateStatus(item.id, "cancelled");
      cancelledQueueItemIds.push(item.id);
    }
  }

  return { cancelledWorkflowRunIds, cancelledQueueItemIds };
}
