import {
  createBusEnvelope,
  createEventBuses,
  DOMAIN_EVENT_TYPES,
  type EventBuses,
} from "@clime/event-bus";
import {
  attachNotificationBusForwarder,
  createAccountEventBusBridge,
  type NotificationBusForwarder,
} from "./forwarder.js";
import { createNotificationManager, type NotificationManager } from "./manager.js";

export type NotificationRuntime = {
  buses: EventBuses;
  notificationManager: NotificationManager;
  accountEventBus: ReturnType<typeof createAccountEventBusBridge>;
  stop: () => void;
};

/**
 * Main-process Notification runtime: buses + Inbox forwarder + Account emit bridge.
 * Desktop depends on `@clime/notification` only (not `@clime/event-bus` directly).
 */
export function createNotificationRuntime(): NotificationRuntime {
  const buses = createEventBuses();
  const notificationManager = createNotificationManager();
  const forwarder: NotificationBusForwarder = attachNotificationBusForwarder(
    notificationManager,
    buses,
  );
  const accountEventBus = createAccountEventBusBridge(buses.system);

  return {
    buses,
    notificationManager,
    accountEventBus,
    stop: () => forwarder.stop(),
  };
}

/** Domain progress path for START → Planner Queue → Inbox. */
export async function publishPlannerItemEnqueued(
  buses: EventBuses,
  input: {
    jobId: string;
    traceId: string;
    plannerQueueItemId?: string;
    missionId?: string;
  },
): Promise<void> {
  await buses.domain.publish(
    createBusEnvelope({
      type: DOMAIN_EVENT_TYPES.PlannerItemEnqueued,
      traceId: input.traceId,
      payload: {
        jobId: input.jobId,
        plannerQueueItemId: input.plannerQueueItemId,
        missionId: input.missionId,
      },
    }),
  );
}
