import { withSchemaVersion } from "@clime/shared";
import type { FeatureManagementDeps } from "../persist/ports.js";
import { noopEventSink } from "../persist/ports.js";
import { cancelLeasedWork, type CancelWorkResult } from "./cancel-work.js";

export async function activateKillSwitch(
  deps: FeatureManagementDeps,
  input: {
    scope: string;
    scopeId?: string | null;
    reason: string;
    actor?: string | null;
    traceId: string;
    projectId?: string | null;
  },
): Promise<CancelWorkResult> {
  const now = new Date().toISOString();
  await deps.storage.policies.setKillSwitch({
    scope: input.scope,
    scopeId: input.scopeId ?? null,
    active: 1,
    reason: input.reason,
    activatedAt: now,
  });

  const cancelled = await cancelLeasedWork(
    deps.storage,
    input.projectId ?? (input.scope === "project" ? input.scopeId : null),
  );

  await deps.storage.audit.append({
    projectId: input.projectId ?? null,
    kind: "kill_switch.activated",
    actor: input.actor ?? null,
    payloadJson: JSON.stringify(
      withSchemaVersion({
        data: {
          scope: input.scope,
          scopeId: input.scopeId ?? null,
          reason: input.reason,
          cancelledWorkflowRunIds: cancelled.cancelledWorkflowRunIds,
          cancelledQueueItemIds: cancelled.cancelledQueueItemIds,
        },
      }),
    ),
    traceId: input.traceId,
    occurredAt: now,
  });

  const sink = deps.events ?? noopEventSink;
  await sink.emit({
    type: "KillSwitchActivated",
    traceId: input.traceId,
    payload: {
      scope: input.scope,
      scopeId: input.scopeId ?? null,
      reason: input.reason,
      ...cancelled,
    },
  });

  return cancelled;
}

export async function clearKillSwitch(
  deps: FeatureManagementDeps,
  input: {
    scope: string;
    scopeId?: string | null;
    actor?: string | null;
    traceId: string;
  },
): Promise<void> {
  await deps.storage.policies.setKillSwitch({
    scope: input.scope,
    scopeId: input.scopeId ?? null,
    active: 0,
    reason: null,
    activatedAt: null,
  });

  const now = new Date().toISOString();
  await deps.storage.audit.append({
    projectId: input.scope === "project" ? (input.scopeId ?? null) : null,
    kind: "kill_switch.cleared",
    actor: input.actor ?? null,
    payloadJson: JSON.stringify(
      withSchemaVersion({
        data: {
          scope: input.scope,
          scopeId: input.scopeId ?? null,
        },
      }),
    ),
    traceId: input.traceId,
    occurredAt: now,
  });

  const sink = deps.events ?? noopEventSink;
  await sink.emit({
    type: "KillSwitchCleared",
    traceId: input.traceId,
    payload: {
      scope: input.scope,
      scopeId: input.scopeId ?? null,
    },
  });
}
