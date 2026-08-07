/**
 * Constitution / IA frozen V1 default — auto-promote only at ≥ 91%.
 * Low confidence = suggest only (promote count must remain 0).
 */
export const CONFIDENCE_AUTO_PROMOTE_THRESHOLD = 0.91;

export function canAutoPromote(confidence: number): boolean {
  return (
    Number.isFinite(confidence) &&
    confidence >= CONFIDENCE_AUTO_PROMOTE_THRESHOLD
  );
}

export function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
