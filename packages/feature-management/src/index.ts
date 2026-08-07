/**
 * @clime/feature-management — Feature → Policy → Runtime (+ Kill Switch).
 * Persist via @clime/storage Repository ports only. Mutations = GovernanceAPI.
 */

export {
  createGovernanceAPI,
  type GovernanceAPI,
} from "./api/governance-api.js";

export { createFeatureManagement } from "./create-feature-management.js";

export type {
  AdmitDecision,
  AdmitInput,
  AdmitTerminalHint,
  CapabilityPort,
  FeatureStateView,
  GovernanceDenyCode,
  GovernanceSystemEventType,
  GovernorMetricsPort,
  KillSwitchView,
  PolicyRuleView,
  RuntimeStatusView,
  SystemEventSink,
} from "./types.js";

export { GOVERNANCE_SYSTEM_EVENTS } from "./events.js";

export {
  parsePolicyRuleJson,
  serializePolicyRule,
  type KnownPolicy,
} from "./zod/policy-rule.js";

export type {
  FeatureManagementDeps,
  FeatureManagementStorage,
} from "./persist/ports.js";

export { executeIfAdmitted } from "./runtime/execute-gated.js";
