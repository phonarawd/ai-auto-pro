import { DEFAULT_MAX_CONCURRENT_WORKERS } from "./constants.js";

export type GovernorDecision =
  | { ok: true }
  | { ok: false; code: "GOVERNOR_THROTTLED"; message: string; active: number; max: number };

export type WorkerGovernor = {
  maxConcurrent: number;
  /** Current active leased workers / in-flight jobs. */
  getActiveCount: () => number;
  admit: () => GovernorDecision;
  /** Register a slot taken by a successful lease. */
  acquire: () => void;
  /** Release after job complete / reclaim. */
  release: () => void;
};

/**
 * Lean Resource Governor — concurrency max 2–3 (B3A §5.4).
 * Does not replace Feature→Policy admit(); gates Worker lease only.
 */
export function createWorkerGovernor(
  maxConcurrent: number = DEFAULT_MAX_CONCURRENT_WORKERS,
): WorkerGovernor {
  const max = Math.min(3, Math.max(1, maxConcurrent));
  let active = 0;

  return {
    maxConcurrent: max,
    getActiveCount: () => active,
    admit() {
      if (active >= max) {
        return {
          ok: false,
          code: "GOVERNOR_THROTTLED",
          message: `Governor concurrency limit reached (${active}/${max})`,
          active,
          max,
        };
      }
      return { ok: true };
    },
    acquire() {
      active += 1;
    },
    release() {
      active = Math.max(0, active - 1);
    },
  };
}
