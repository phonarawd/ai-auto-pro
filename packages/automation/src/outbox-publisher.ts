import type { ClimeStorage, EventOutboxRow } from "@clime/storage";
import { OUTBOX_PUBLISH_BATCH } from "./constants.js";

export type OutboxDeliverySink = {
  deliver: (row: EventOutboxRow) => Promise<void>;
};

export type OutboxPublisher = {
  /** Drain one batch of pending outbox rows (at-least-once). */
  tick: (limit?: number) => Promise<{ published: number; failed: number }>;
  start: (intervalMs?: number) => void;
  stop: () => void;
};

export type OutboxPublisherDeps = {
  storage: Pick<ClimeStorage, "eventOutbox">;
  sink: OutboxDeliverySink;
};

/**
 * Outbox publisher worker — B3A §5.5.
 * Storage owns atomic enqueue; Automation owns drain.
 */
export function createOutboxPublisher(deps: OutboxPublisherDeps): OutboxPublisher {
  let timer: ReturnType<typeof setInterval> | undefined;

  return {
    async tick(limit = OUTBOX_PUBLISH_BATCH) {
      const pending = await deps.storage.eventOutbox.listPending(limit);
      let published = 0;
      let failed = 0;
      for (const row of pending) {
        try {
          await deps.sink.deliver(row);
          await deps.storage.eventOutbox.markPublished(
            row.id,
            new Date().toISOString(),
          );
          published += 1;
        } catch {
          await deps.storage.eventOutbox.markFailed(row.id, row.attempts + 1);
          failed += 1;
        }
      }
      return { published, failed };
    },

    start(intervalMs = 1000) {
      if (timer) return;
      timer = setInterval(() => {
        void this.tick();
      }, intervalMs);
      if (typeof timer === "object" && "unref" in timer) {
        timer.unref();
      }
    },

    stop() {
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
    },
  };
}

/** No-op sink for tests / when buses not wired. */
export const noopOutboxSink: OutboxDeliverySink = {
  async deliver() {
    /* delivered */
  },
};
