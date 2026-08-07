import { JITTER_MAX_MS, JITTER_MIN_MS } from "./schemas.js";

/**
 * Box–Muller Gaussian sample, clamped to [JITTER_MIN_MS, JITTER_MAX_MS].
 * Mean ≈ midpoint (25s); σ ≈ 8s so most mass lands in-range before clamp.
 */
export function sampleGaussianJitterMs(random: () => number = Math.random): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = random();
  while (v === 0) v = random();
  const mag = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  const mean = (JITTER_MIN_MS + JITTER_MAX_MS) / 2;
  const sigma = 8_000;
  const raw = mean + mag * sigma;
  return Math.round(Math.min(JITTER_MAX_MS, Math.max(JITTER_MIN_MS, raw)));
}

export type DelayFn = (ms: number) => Promise<void>;

export const wallClockDelay: DelayFn = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
