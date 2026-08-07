import type { GovernanceAPI } from "../api/governance-api.js";
import type { AdmitDecision, AdmitInput } from "../types.js";

/**
 * Hard gate helper — proves Runtime 미통과 실행 0.
 * Side-effect callbacks run only after admit() ok.
 */
export async function executeIfAdmitted<T>(
  api: GovernanceAPI,
  input: AdmitInput,
  sideEffect: () => T | Promise<T>,
): Promise<{ admitted: true; result: T } | { admitted: false; decision: AdmitDecision & { ok: false } }> {
  const decision = await api.admit(input);
  if (!decision.ok) {
    return { admitted: false, decision };
  }
  const result = await sideEffect();
  return { admitted: true, result };
}
