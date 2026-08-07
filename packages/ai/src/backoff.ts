import type { BackoffOptions } from "./types.js";

export type ResolvedBackoff = {
  maxRetriesPerAdapter: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
};

export function resolveBackoffOptions(
  options?: BackoffOptions,
): ResolvedBackoff {
  return {
    maxRetriesPerAdapter: options?.maxRetriesPerAdapter ?? 2,
    baseDelayMs: options?.baseDelayMs ?? 50,
    maxDelayMs: options?.maxDelayMs ?? 2_000,
    jitter: options?.jitter ?? true,
  };
}

/** delayMs = min(max, base * 2^attempt) + optional full jitter. */
export function computeBackoffDelayMs(
  attempt: number,
  opts: ResolvedBackoff,
  random: () => number = Math.random,
): number {
  const exp = Math.min(
    opts.maxDelayMs,
    opts.baseDelayMs * 2 ** attempt,
  );
  if (!opts.jitter) return exp;
  return Math.floor(random() * (exp + 1));
}

export async function defaultSleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
