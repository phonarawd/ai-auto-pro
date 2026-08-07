import {
  createBusEnvelope,
  DOMAIN_EVENT_TYPES,
  SYSTEM_EVENT_TYPES,
  type DomainEventBus,
  type SystemEventBus,
  type Unsubscribe,
} from "@clime/event-bus";
import type { NotificationManager } from "./manager.js";

export type NotificationBusForwarder = {
  stop: () => void;
};

/**
 * Selective Domain/System → Inbox forwarder (04 §7 / S3A §6.3).
 * UI never subscribes to buses — only NotificationAPI / push channel.
 */
export function attachNotificationBusForwarder(
  manager: NotificationManager,
  buses: { system: SystemEventBus; domain: DomainEventBus },
): NotificationBusForwarder {
  const unsubs: Unsubscribe[] = [];

  unsubs.push(
    buses.system.subscribe(SYSTEM_EVENT_TYPES.PublishChallengeDetected, (event) => {
      const payload = event.payload;
      manager.enqueueChallengePause({
        accountId: typeof payload.accountId === "string" ? payload.accountId : undefined,
        platform: typeof payload.platform === "string" ? payload.platform : undefined,
        reason:
          typeof payload.reason === "string"
            ? payload.reason
            : "보안 챌린지 감지 — 자동게시 일시정지 (PAUSED_CHALLENGE)",
        traceId: event.traceId,
      });
    }),
  );

  unsubs.push(
    buses.system.subscribe(SYSTEM_EVENT_TYPES.PublishAutoPaused, (event) => {
      const accountId =
        typeof event.payload.accountId === "string" ? event.payload.accountId : undefined;
      // Dedup: challenge event already created Inbox for same trace or account.
      const existing = manager.listInbox().find(
        (i) =>
          i.kind === "challenge.pause" &&
          i.terminalState === "PAUSED_CHALLENGE" &&
          (i.traceId === event.traceId || (accountId !== undefined && i.accountId === accountId)),
      );
      if (existing) return;

      manager.enqueueChallengePause({
        accountId,
        platform: typeof event.payload.platform === "string" ? event.payload.platform : undefined,
        reason:
          typeof event.payload.reason === "string"
            ? event.payload.reason
            : "게시 파이프라인 자동 일시정지",
        traceId: event.traceId,
      });
    }),
  );

  unsubs.push(
    buses.system.subscribe(SYSTEM_EVENT_TYPES.SessionExpired, (event) => {
      manager.enqueue({
        kind: "session.expired",
        title: "세션 만료",
        body: "플랫폼 세션이 만료되었습니다. 계정 관리에서 다시 연결하세요.",
        severity: "warning",
        traceId: event.traceId,
        accountId: typeof event.payload.accountId === "string" ? event.payload.accountId : undefined,
        actions: [{ id: "open-account", label: "계정 관리 열기", kind: "open-account" }],
      });
    }),
  );

  unsubs.push(
    buses.system.subscribe(SYSTEM_EVENT_TYPES.GovernorThrottled, (event) => {
      manager.enqueue({
        kind: "governor.throttled",
        title: "리소스 스로틀",
        body: "Governor가 작업 속도를 제한했습니다. Inbox에서 진행 상태를 확인하세요.",
        severity: "warning",
        traceId: event.traceId,
        jobId: typeof event.payload.jobId === "string" ? event.payload.jobId : undefined,
      });
    }),
  );

  unsubs.push(
    buses.domain.subscribe(DOMAIN_EVENT_TYPES.PlannerItemEnqueued, (event) => {
      const jobId =
        typeof event.payload.jobId === "string"
          ? event.payload.jobId
          : typeof event.payload.plannerQueueItemId === "string"
            ? event.payload.plannerQueueItemId
            : undefined;
      manager.enqueueJobProgress({
        kind: "job.enqueued",
        jobId: jobId ?? "job_unknown",
        title: "작업 대기열 등록",
        body: "Planner Queue에 등록되었습니다. 진행은 Inbox에서 확인하세요.",
        traceId: event.traceId,
      });
    }),
  );

  return {
    stop: () => {
      for (const unsub of unsubs) unsub();
    },
  };
}

/**
 * Bridge AccountManager EventBusLike.emit → System bus envelopes.
 */
export function createAccountEventBusBridge(system: SystemEventBus) {
  const pending: Promise<void>[] = [];

  return {
    emit(event: string, payload: Record<string, unknown>): void {
      const traceId =
        typeof payload.traceId === "string" && payload.traceId.length > 0
          ? payload.traceId
          : `tr_notify_${Date.now().toString(36)}`;
      const task = system
        .publish(
          createBusEnvelope({
            type: event,
            traceId,
            payload,
          }),
        )
        .catch(() => {
          /* never throw into AccountManager sync path */
        })
        .then(() => undefined);
      pending.push(task);
    },
    /** Test/host helper — flush in-flight System publishes. */
    async flush(): Promise<void> {
      await Promise.all(pending.splice(0, pending.length));
    },
  };
}
