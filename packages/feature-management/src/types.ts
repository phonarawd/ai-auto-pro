import type { FeatureLifecycle, PublishMode } from "@clime/shared";

export type GovernanceDenyCode =
  | "FEATURE_DISABLED"
  | "POLICY_DENIED"
  | "CAPABILITY_DENIED"
  | "GOVERNOR_THROTTLED"
  | "KILL_SWITCH"
  | "VALIDATION_FAILED";

export type AdmitTerminalHint =
  | "BLOCKED_POLICY"
  | "BLOCKED_HUMAN"
  | "BLOCKED_CAPABILITY"
  | "CANCELLED";

export type AdmitInput = {
  featureKey: string;
  projectId?: string | null;
  userKey?: string | null;
  traceId: string;
  platformSideEffect?: boolean;
  accountId?: string | null;
  publishMode?: PublishMode;
  humanApproved?: boolean;
  validated?: boolean;
  costUnits?: number;
};

export type AdmitDecision =
  | { ok: true; traceId: string }
  | {
      ok: false;
      code: GovernanceDenyCode;
      message: string;
      traceId: string;
      terminalHint?: AdmitTerminalHint;
    };

export type FeatureStateView = {
  id: string;
  featureKey: string;
  scope: string;
  scopeId: string | null;
  lifecycle: FeatureLifecycle;
  updatedAt: string;
};

export type PolicyRuleView = {
  id: string;
  featureKey: string | null;
  scope: string;
  scopeId: string | null;
  ruleJson: string;
  enabled: boolean;
  updatedAt: string;
};

export type KillSwitchView = {
  id: string;
  scope: string;
  scopeId: string | null;
  active: boolean;
  reason: string | null;
  activatedAt: string | null;
  updatedAt: string;
};

export type RuntimeStatusView = {
  killSwitchActive: boolean;
  killSwitchReason: string | null;
  activeRunCount: number;
  schema_version: 1;
};

export type GovernanceSystemEventType =
  | "FeatureFlagDenied"
  | "PolicyDenied"
  | "GovernorThrottled"
  | "KillSwitchActivated"
  | "KillSwitchCleared";

export type CapabilityPort = {
  allowsPublish(input: {
    accountId: string;
    publishMode?: PublishMode;
  }): Promise<{ ok: true } | { ok: false; reason: string }>;
};

export type GovernorMetricsPort = {
  countActiveRuns(projectId: string | null): Promise<number>;
};

export type SystemEventSink = {
  emit(event: {
    type: GovernanceSystemEventType;
    traceId: string;
    payload: Record<string, unknown>;
  }): void | Promise<void>;
};
