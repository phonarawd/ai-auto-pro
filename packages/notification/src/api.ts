import type { NotificationManager } from "./manager.js";
import type { ToastPrefs } from "./types.js";

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

/**
 * Typed NotificationAPI handlers (S3A §5.13).
 */
export function createNotificationApiHandlers(manager: NotificationManager) {
  return {
    "notification.listInbox": async () => manager.listInbox(),

    "notification.markRead": async (args: { itemId: string }) => manager.markRead(args.itemId),

    "notification.dismiss": async (args: { itemId: string }) => manager.dismiss(args.itemId),

    "notification.getToastPrefs": async () => manager.getToastPrefs(),

    "notification.setToastPrefs": async (args: {
      prefs?: Partial<Omit<ToastPrefs, "schema_version" | "challengeAlwaysInbox">>;
      enabled?: boolean;
      soundEnabled?: boolean;
    }) => {
      const prefs = args.prefs ?? {
        ...(typeof args.enabled === "boolean" ? { enabled: args.enabled } : {}),
        ...(typeof args.soundEnabled === "boolean" ? { soundEnabled: args.soundEnabled } : {}),
      };
      const saved = manager.setToastPrefs(prefs);
      return { schema_version: 1 as const, saved: true, prefs: saved };
    },
  };
}

/**
 * Domain host handler map (`domain:notification.*`) — B2 wiring into createDomainHost({ handlers }).
 */
export function createNotificationDomainHandlers(
  manager: NotificationManager,
): Record<string, DomainHandler> {
  const api = createNotificationApiHandlers(manager);

  return {
    "notification.listInbox": async () => api["notification.listInbox"](),

    "notification.markRead": async (args) =>
      api["notification.markRead"]({ itemId: asString(args.itemId) }),

    "notification.dismiss": async (args) =>
      api["notification.dismiss"]({ itemId: asString(args.itemId) }),

    "notification.getToastPrefs": async () => api["notification.getToastPrefs"](),

    "notification.setToastPrefs": async (args) => {
      const prefs =
        args.prefs && typeof args.prefs === "object"
          ? (args.prefs as Partial<Omit<ToastPrefs, "schema_version" | "challengeAlwaysInbox">>)
          : undefined;
      return api["notification.setToastPrefs"]({
        prefs,
        enabled: typeof args.enabled === "boolean" ? args.enabled : undefined,
        soundEnabled: typeof args.soundEnabled === "boolean" ? args.soundEnabled : undefined,
      });
    },
  };
}
