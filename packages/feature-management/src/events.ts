import type { GovernanceSystemEventType } from "./types.js";

/** Frozen System bus event names (RFC 13 / S25A §8). */
export const GOVERNANCE_SYSTEM_EVENTS = {
  FeatureFlagDenied: "FeatureFlagDenied",
  PolicyDenied: "PolicyDenied",
  GovernorThrottled: "GovernorThrottled",
  KillSwitchActivated: "KillSwitchActivated",
  KillSwitchCleared: "KillSwitchCleared",
} as const satisfies Record<GovernanceSystemEventType, GovernanceSystemEventType>;
