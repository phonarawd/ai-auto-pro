import { withSchemaVersion } from "@clime/shared";
import type { ClimeStorage } from "@clime/storage";
import {
  bufferDecisionItems,
  DEFAULT_QUEUE_VOLUME_CAP,
  suggestDeadlineForItem,
} from "./scheduler-intelligence.js";

export type DecisionQueueItemInput = {
  priority: number;
  expectedRoi?: number;
  /** ISO-8601 deadline; when omitted, Scheduler Intelligence may fill */
  deadline?: string | null;
  dependencyIds?: string[];
  /** When true, PlannerQueueItem.humanApproval = 1 */
  humanApproval?: boolean;
  retryCount?: number;
  payload: Record<string, unknown> & { schema_version: 1; kind: string };
};

export type EnqueueFromDecisionInput = {
  projectId: string;
  decisionId: string;
  missionId: string;
  items: DecisionQueueItemInput[];
  /** Volume buffer cap (default DEFAULT_QUEUE_VOLUME_CAP) */
  maxItems?: number;
  /** Apply Scheduler Intelligence for missing deadlines (default true) */
  applySchedulerIntel?: boolean;
  /** Clock override for deterministic tests */
  now?: Date;
};

export type EnqueueFromDecisionResult = {
  queueItemIds: string[];
  bufferedCount: number;
  droppedCount: number;
  volumeCap: number;
};

/**
 * Planner Queue producer — EA §3.4 / RFC 05 §5.3 + H polish.
 * Decision Engine calls this; Workers must never be invoked from Decision.
 *
 * H-A: volume buffering + Scheduler Intelligence deadlines + richer queue fields.
 */
export async function enqueueFromDecision(
  storage: Pick<ClimeStorage, "plannerQueue">,
  input: EnqueueFromDecisionInput,
): Promise<EnqueueFromDecisionResult> {
  const applyIntel = input.applySchedulerIntel !== false;
  const volumeCap = Math.max(1, input.maxItems ?? DEFAULT_QUEUE_VOLUME_CAP);
  const { kept, dropped } = bufferDecisionItems({
    items: input.items,
    maxItems: volumeCap,
  });
  const now = input.now ?? new Date();

  const queueItemIds: string[] = [];
  for (let i = 0; i < kept.length; i += 1) {
    const item = kept[i]!;
    if (item.payload.schema_version !== 1) {
      throw new Error("Queue payload requires schema_version: 1");
    }

    let deadline: string | null = item.deadline ?? null;
    let cadenceHint: string | undefined;
    if (!deadline && applyIntel) {
      const slot = suggestDeadlineForItem({
        priority: item.priority,
        expectedRoi: item.expectedRoi,
        slotIndex: i,
        total: kept.length,
        now,
      });
      deadline = slot.suggestedDeadline;
      cadenceHint = slot.cadenceHint;
    }

    const dependencyIds = item.dependencyIds ?? [];
    const payload = cadenceHint
      ? { ...item.payload, scheduleCadenceHint: cadenceHint }
      : item.payload;

    const { id } = await storage.plannerQueue.enqueue({
      projectId: input.projectId,
      priority: item.priority,
      deadline,
      expectedRoi: item.expectedRoi ?? null,
      dependencyIdsJson: JSON.stringify(
        withSchemaVersion({ ids: dependencyIds }),
      ),
      retryCount: item.retryCount ?? 0,
      humanApproval: item.humanApproval ? 1 : 0,
      decisionId: input.decisionId,
      missionId: input.missionId,
      payloadJson: JSON.stringify(payload),
      status: "ready",
      leasedBy: null,
      leasedAt: null,
      leaseExpiresAt: null,
    });
    queueItemIds.push(id);
  }

  return {
    queueItemIds,
    bufferedCount: kept.length,
    droppedCount: dropped.length,
    volumeCap,
  };
}
