import type { CircuitBreakerOptions } from "./types.js";

export type BreakerState = "closed" | "open" | "half_open";

export type ResolvedCircuitBreakerOptions = {
  failureThreshold: number;
  openMs: number;
  halfOpenSuccesses: number;
};

export function resolveCircuitBreakerOptions(
  options?: CircuitBreakerOptions,
): ResolvedCircuitBreakerOptions {
  return {
    failureThreshold: options?.failureThreshold ?? 3,
    openMs: options?.openMs ?? 5_000,
    halfOpenSuccesses: options?.halfOpenSuccesses ?? 1,
  };
}

type BreakerInternal = {
  state: BreakerState;
  consecutiveFailures: number;
  openedAt: number | null;
  halfOpenSuccesses: number;
};

export type CircuitBreakerRegistry = {
  /** Returns false when the adapter must be skipped (open). */
  allow(adapterId: string): boolean;
  recordSuccess(adapterId: string): void;
  recordFailure(adapterId: string): void;
  getState(adapterId: string): BreakerState;
};

export function createCircuitBreakerRegistry(
  options?: CircuitBreakerOptions,
  now: () => number = () => Date.now(),
): CircuitBreakerRegistry {
  const opts = resolveCircuitBreakerOptions(options);
  const map = new Map<string, BreakerInternal>();

  function get(adapterId: string): BreakerInternal {
    let entry = map.get(adapterId);
    if (!entry) {
      entry = {
        state: "closed",
        consecutiveFailures: 0,
        openedAt: null,
        halfOpenSuccesses: 0,
      };
      map.set(adapterId, entry);
    }
    return entry;
  }

  function transitionFromOpen(entry: BreakerInternal): void {
    if (entry.state !== "open" || entry.openedAt == null) return;
    if (now() - entry.openedAt >= opts.openMs) {
      entry.state = "half_open";
      entry.halfOpenSuccesses = 0;
    }
  }

  return {
    allow(adapterId: string): boolean {
      const entry = get(adapterId);
      transitionFromOpen(entry);
      if (entry.state === "open") return false;
      return true;
    },

    recordSuccess(adapterId: string): void {
      const entry = get(adapterId);
      if (entry.state === "half_open") {
        entry.halfOpenSuccesses += 1;
        if (entry.halfOpenSuccesses >= opts.halfOpenSuccesses) {
          entry.state = "closed";
          entry.consecutiveFailures = 0;
          entry.openedAt = null;
          entry.halfOpenSuccesses = 0;
        }
        return;
      }
      entry.state = "closed";
      entry.consecutiveFailures = 0;
      entry.openedAt = null;
    },

    recordFailure(adapterId: string): void {
      const entry = get(adapterId);
      if (entry.state === "half_open") {
        entry.state = "open";
        entry.openedAt = now();
        entry.consecutiveFailures = opts.failureThreshold;
        entry.halfOpenSuccesses = 0;
        return;
      }
      entry.consecutiveFailures += 1;
      if (entry.consecutiveFailures >= opts.failureThreshold) {
        entry.state = "open";
        entry.openedAt = now();
      }
    },

    getState(adapterId: string): BreakerState {
      const entry = get(adapterId);
      transitionFromOpen(entry);
      return entry.state;
    },
  };
}
