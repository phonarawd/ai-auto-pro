import type { FeatureLifecycle } from "@clime/shared";
import { envelopeJson } from "../repos/helpers.js";

/** Marker in global_settings — seed is idempotent when present. */
export const SEED_MARKER_KEY = "storage.seed.v1";

export const EMPTY_PROJECT_NAME = "Empty Project";

/** Stable seed IDs so re-seed / tests can find rows deterministically. */
export const SEED_IDS = {
  emptyProject: "seed_project_empty",
  killSwitchGlobal: "seed_kill_switch_global",
  policyBaseline: "seed_policy_baseline",
  policyPublishValidate: "seed_policy_publish_validate",
} as const;

/**
 * Default Feature keys for Feature→Policy→Runtime (slice 2.5).
 * Lean V1 set — no demo spam.
 */
export const DEFAULT_FEATURES: ReadonlyArray<{
  id: string;
  featureKey: string;
  lifecycle: FeatureLifecycle;
}> = [
  {
    id: "seed_feature_mission_start",
    featureKey: "feature.missionCenter.start",
    lifecycle: "enabled",
  },
  {
    id: "seed_feature_workflow_execute",
    featureKey: "feature.workflow.execute",
    lifecycle: "enabled",
  },
  {
    id: "seed_feature_content_generate",
    featureKey: "feature.content.generate",
    lifecycle: "enabled",
  },
  {
    id: "seed_feature_content_validate",
    featureKey: "feature.content.validate",
    lifecycle: "enabled",
  },
  {
    id: "seed_feature_publish_api",
    featureKey: "feature.publish.api",
    lifecycle: "enabled",
  },
  {
    id: "seed_feature_publish_session",
    featureKey: "feature.publish.session",
    lifecycle: "experimental",
  },
  {
    id: "seed_feature_export_backup",
    featureKey: "feature.export.backup",
    lifecycle: "enabled",
  },
  {
    id: "seed_feature_ads_spend",
    featureKey: "feature.ads.spend",
    lifecycle: "disabled",
  },
];

export function baselinePolicyRuleJson(): string {
  return envelopeJson({
    kind: "baseline",
    pauseOnChallenge: true,
    maxRetries: 3,
    humanApprovalRequired: false,
  });
}

export function publishValidatePolicyRuleJson(): string {
  return envelopeJson({
    kind: "publish_gate",
    requireValidate: true,
    requireCapability: true,
  });
}

export function seedMarkerValueJson(): string {
  return envelopeJson({
    seeded: true,
    emptyProjectId: SEED_IDS.emptyProject,
  });
}
