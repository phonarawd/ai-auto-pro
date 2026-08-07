import { SCHEMA_VERSION } from "@clime/shared";
import {
  DEFAULT_TOAST_PREFS,
  FORBIDDEN_BYPASS_CTA_PATTERNS,
  inboxItemSchema,
  toastPrefsSchema,
  type EnqueueInboxInput,
  type InboxItem,
  type ToastPrefs,
} from "./types.js";

export type NotificationPushFn = (item: InboxItem) => void;

function generateInboxId(): string {
  return `inbox_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function assertNoBypassActions(actions: EnqueueInboxInput["actions"]): void {
  for (const action of actions ?? []) {
    for (const pattern of FORBIDDEN_BYPASS_CTA_PATTERNS) {
      if (pattern.test(action.label) || pattern.test(action.id)) {
        throw new Error(
          `Forbidden bypass CTA rejected: "${action.label}" (constitutional: challenge → pause + Inbox only)`,
        );
      }
    }
  }
}

/**
 * In-memory Inbox + toast prefs (V1 lean — JSON-until-hot; no first-class inbox table).
 * Progress path: Domain/System events → enqueue → optional push on `domain:notification.push`.
 */
export class NotificationManager {
  private items = new Map<string, InboxItem>();
  private toastPrefs: ToastPrefs = { ...DEFAULT_TOAST_PREFS };
  private onPush?: NotificationPushFn;

  constructor(options?: { onPush?: NotificationPushFn }) {
    this.onPush = options?.onPush;
  }

  public setPushHandler(onPush: NotificationPushFn | undefined): void {
    this.onPush = onPush;
  }

  public listInbox(includeDismissed = false): InboxItem[] {
    return Array.from(this.items.values())
      .filter((item) => includeDismissed || !item.dismissed)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  public getItem(itemId: string): InboxItem | undefined {
    return this.items.get(itemId);
  }

  public enqueue(input: EnqueueInboxInput): InboxItem {
    assertNoBypassActions(input.actions);

    const item = inboxItemSchema.parse({
      schema_version: SCHEMA_VERSION,
      id: generateInboxId(),
      kind: input.kind,
      title: input.title,
      body: input.body,
      severity: input.severity ?? (input.kind === "challenge.pause" ? "danger" : "info"),
      read: false,
      dismissed: false,
      createdAt: new Date().toISOString(),
      traceId: input.traceId,
      jobId: input.jobId,
      accountId: input.accountId,
      platform: input.platform,
      terminalState: input.terminalState,
      actions: input.actions ?? [],
    });

    this.items.set(item.id, item);
    this.onPush?.(item);
    return item;
  }

  /** Challenge/captcha/lock → PAUSED_CHALLENGE Inbox (no silent failure, no bypass CTA). */
  public enqueueChallengePause(input: {
    accountId?: string;
    platform?: string;
    reason?: string;
    traceId?: string;
  }): InboxItem {
    return this.enqueue({
      kind: "challenge.pause",
      title: "게시 일시정지 — 보안 챌린지",
      body:
        input.reason ||
        "플랫폼 보안 검증(캡차/잠금)이 감지되어 자동게시가 일시정지되었습니다. 계정에서 직접 확인한 뒤 재개하세요.",
      severity: "danger",
      terminalState: "PAUSED_CHALLENGE",
      accountId: input.accountId,
      platform: input.platform,
      traceId: input.traceId,
      actions: [
        { id: "open-account", label: "계정 관리 열기", kind: "open-account" },
        { id: "resume", label: "검증 후 게시 재개", kind: "resume-publish" },
      ],
    });
  }

  public enqueueJobProgress(input: {
    kind: "job.enqueued" | "job.progress" | "job.terminal";
    jobId: string;
    title: string;
    body: string;
    traceId?: string;
    severity?: InboxItem["severity"];
  }): InboxItem {
    return this.enqueue({
      kind: input.kind,
      title: input.title,
      body: input.body,
      jobId: input.jobId,
      traceId: input.traceId,
      severity: input.severity ?? "info",
    });
  }

  public markRead(itemId: string): { schema_version: 1; marked: boolean } {
    const item = this.items.get(itemId);
    if (!item) return { schema_version: SCHEMA_VERSION, marked: false };
    this.items.set(itemId, { ...item, read: true });
    return { schema_version: SCHEMA_VERSION, marked: true };
  }

  public dismiss(itemId: string): { schema_version: 1; dismissed: boolean } {
    const item = this.items.get(itemId);
    if (!item) return { schema_version: SCHEMA_VERSION, dismissed: false };
    // Challenge items may be dismissed only after acknowledge — still kept as dismissed, never silent-deleted without Inbox trail.
    this.items.set(itemId, { ...item, dismissed: true, read: true });
    return { schema_version: SCHEMA_VERSION, dismissed: true };
  }

  public getToastPrefs(): ToastPrefs {
    return toastPrefsSchema.parse(this.toastPrefs);
  }

  public setToastPrefs(prefs: Partial<Omit<ToastPrefs, "schema_version" | "challengeAlwaysInbox">>): ToastPrefs {
    this.toastPrefs = toastPrefsSchema.parse({
      ...this.toastPrefs,
      ...prefs,
      schema_version: SCHEMA_VERSION,
      // Challenge must always surface in Inbox — not toast-dismissable alone.
      challengeAlwaysInbox: true,
    });
    return this.toastPrefs;
  }

  public unreadCount(): number {
    return this.listInbox().filter((i) => !i.read).length;
  }
}

export function createNotificationManager(options?: {
  onPush?: NotificationPushFn;
}): NotificationManager {
  return new NotificationManager(options);
}
