import { DEFAULT_DAILY_PUBLISH_QUOTA } from "./schemas.js";

export type DailyQuotaLedger = {
  /** Returns remaining capacity (0 = denied). */
  remaining(accountId: string, dayKey?: string): number;
  /** Increment after successful publish. */
  recordSuccess(accountId: string, dayKey?: string): void;
  /** Test helper */
  getCount(accountId: string, dayKey?: string): number;
};

function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function createDailyQuotaLedger(options?: {
  limit?: number;
  now?: () => Date;
}): DailyQuotaLedger {
  const limit = options?.limit ?? DEFAULT_DAILY_PUBLISH_QUOTA;
  const now = options?.now ?? (() => new Date());
  const counts = new Map<string, number>();

  const keyOf = (accountId: string, dayKey?: string) =>
    `${accountId}:${dayKey ?? utcDayKey(now())}`;

  return {
    remaining(accountId, dayKey) {
      const used = counts.get(keyOf(accountId, dayKey)) ?? 0;
      return Math.max(0, limit - used);
    },
    recordSuccess(accountId, dayKey) {
      const k = keyOf(accountId, dayKey);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    },
    getCount(accountId, dayKey) {
      return counts.get(keyOf(accountId, dayKey)) ?? 0;
    },
  };
}
