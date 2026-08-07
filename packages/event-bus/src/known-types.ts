/** Illustrative Domain bus event names (RFC 06 / 09 / S3A §6.3). */
export const DOMAIN_EVENT_TYPES = {
  TrendSpikeDetected: "TrendSpikeDetected",
  KeywordDiscovered: "KeywordDiscovered",
  DecisionMade: "DecisionMade",
  PlannerItemEnqueued: "PlannerItemEnqueued",
  RoiRecorded: "RoiRecorded",
  MissionReady: "MissionReady",
  ContentReadyForReview: "ContentReadyForReview",
  ContentGenerated: "ContentGenerated",
} as const;

/** Illustrative System bus event names (RFC 12 / 13 / S3A §6.3). */
export const SYSTEM_EVENT_TYPES = {
  SessionExpired: "SessionExpired",
  GovernorThrottled: "GovernorThrottled",
  KillSwitchActivated: "KillSwitchActivated",
  KillSwitchCleared: "KillSwitchCleared",
  FeatureFlagDenied: "FeatureFlagDenied",
  PolicyDenied: "PolicyDenied",
  HealthDegraded: "HealthDegraded",
  PublishChallengeDetected: "PublishChallengeDetected",
  /** Pipeline auto-paused after challenge/captcha/lock (B1/B2 → Inbox). */
  PublishAutoPaused: "PublishAutoPaused",
  ReflectionProposal: "ReflectionProposal",
} as const;

/** Illustrative Command bus names (RFC 12 §6). */
export const COMMAND_TYPES = {
  EnqueuePlannerItem: "EnqueuePlannerItem",
  GenerateContent: "GenerateContent",
} as const;

/** Illustrative Query bus names (RFC 12 §6). */
export const QUERY_TYPES = {
  GetMissionToday: "GetMissionToday",
} as const;
