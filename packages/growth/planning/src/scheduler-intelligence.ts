import { withSchemaVersion } from "@clime/shared";

/** Default morning batch slot (local wall-clock hour) — Automation owns cron; this is advisory. */
export const DEFAULT_MORNING_BATCH_HOUR = 9;

/** Max items a single Decision enqueue may buffer into Planner Queue (volume buffering). */
export const DEFAULT_QUEUE_VOLUME_CAP = 10;

export type ScheduleSlotHint = {
  /** ISO-8601 suggested deadline / preferred run-after */
  suggestedDeadline: string;
  /** Human-readable cadence hint (advisory only) */
  cadenceHint: string;
  /** Slot index within the buffered batch (0-based) */
  slotIndex: number;
};

export type ScheduleSuggestionInput = {
  priority: number;
  expectedRoi?: number;
  /** Optional explicit deadline from Decision — wins over intel */
  deadline?: string | null;
  index: number;
  total: number;
};

export type ScheduleSuggestionResult = {
  schema_version: 1;
  kind: "growth.schedule_suggestion";
  slots: ScheduleSlotHint[];
  volumeCap: number;
  bufferedCount: number;
  droppedCount: number;
};

export type BufferDecisionItemsInput<T extends { priority: number; expectedRoi?: number }> = {
  items: T[];
  maxItems?: number;
};

/**
 * Volume buffer: sort by priority (asc = higher urgency), then expectedRoi desc, then cap.
 * Does not mutate Decision rank — only Planner Queue intake shape.
 */
export function bufferDecisionItems<T extends { priority: number; expectedRoi?: number }>(
  input: BufferDecisionItemsInput<T>,
): { kept: T[]; dropped: T[]; volumeCap: number } {
  const volumeCap = Math.max(1, input.maxItems ?? DEFAULT_QUEUE_VOLUME_CAP);
  const sorted = [...input.items].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return (b.expectedRoi ?? 0) - (a.expectedRoi ?? 0);
  });
  return {
    kept: sorted.slice(0, volumeCap),
    dropped: sorted.slice(volumeCap),
    volumeCap,
  };
}

function startOfLocalDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

/**
 * Suggest a deadline for a queue item.
 * High priority → nearer morning/next-hour slots; lower priority spreads later same day / next day.
 * Automation owns actual cron/event triggers — planning only advises.
 */
export function suggestDeadlineForItem(
  input: {
    priority: number;
    expectedRoi?: number;
    slotIndex: number;
    total: number;
    now?: Date;
  },
): ScheduleSlotHint {
  const now = input.now ?? new Date();
  const day = startOfLocalDay(now);
  const morning = new Date(day);
  morning.setHours(DEFAULT_MORNING_BATCH_HOUR, 0, 0, 0);

  // Spread slots by 30 minutes to avoid enqueue burst at the same instant.
  const spreadMinutes = input.slotIndex * 30;
  // Lower priority (higher number) pushes +2h per priority step beyond 1.
  const priorityLagHours = Math.max(0, input.priority - 1) * 2;
  // Mild ROI boost: higher ROI → slightly earlier (up to 30m).
  const roiBoostMinutes = Math.round(Math.min(1, Math.max(0, input.expectedRoi ?? 0)) * 30);

  let target = new Date(morning.getTime());
  target = new Date(
    target.getTime() +
      priorityLagHours * 60 * 60 * 1000 +
      spreadMinutes * 60 * 1000 -
      roiBoostMinutes * 60 * 1000,
  );

  // If target already passed today, roll to next day same wall clock offset from morning.
  if (target.getTime() <= now.getTime()) {
    const tomorrowMorning = new Date(morning);
    tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
    target = new Date(
      tomorrowMorning.getTime() +
        priorityLagHours * 60 * 60 * 1000 +
        spreadMinutes * 60 * 1000 -
        roiBoostMinutes * 60 * 1000,
    );
  }

  const cadenceHint =
    input.priority <= 1
      ? "morning_batch_priority"
      : input.priority <= 3
        ? "same_day_spread"
        : "next_window_deferred";

  return {
    suggestedDeadline: target.toISOString(),
    cadenceHint,
    slotIndex: input.slotIndex,
  };
}

/**
 * Scheduler Intelligence — advisory timing for a Decision enqueue batch.
 * Does not write Queue; producer applies deadlines. Automation owns triggers.
 */
export function suggestSchedule(
  items: Array<{ priority: number; expectedRoi?: number; deadline?: string | null }>,
  options?: { maxItems?: number; now?: Date },
): ScheduleSuggestionResult {
  const { kept, dropped, volumeCap } = bufferDecisionItems({
    items,
    maxItems: options?.maxItems,
  });
  const now = options?.now ?? new Date();
  const slots: ScheduleSlotHint[] = kept.map((item, index) => {
    if (item.deadline) {
      return {
        suggestedDeadline: item.deadline,
        cadenceHint: "explicit_deadline",
        slotIndex: index,
      };
    }
    return suggestDeadlineForItem({
      priority: item.priority,
      expectedRoi: item.expectedRoi,
      slotIndex: index,
      total: kept.length,
      now,
    });
  });

  return withSchemaVersion({
    kind: "growth.schedule_suggestion" as const,
    slots,
    volumeCap,
    bufferedCount: kept.length,
    droppedCount: dropped.length,
  });
}
