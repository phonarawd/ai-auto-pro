import type { ClimeSqliteDatabase } from "../db/client.js";
import { project } from "../db/schema.js";
import type { ClimeStorage } from "../ports/repositories.js";
import { envelopeJson, nowIso } from "../repos/helpers.js";
import {
  DEFAULT_FEATURES,
  EMPTY_PROJECT_NAME,
  SEED_IDS,
  SEED_MARKER_KEY,
  baselinePolicyRuleJson,
  publishValidatePolicyRuleJson,
  seedMarkerValueJson,
} from "./defaults.js";

export type SeedResult = {
  alreadySeeded: boolean;
  emptyProjectId: string;
  featureCount: number;
  policyCount: number;
};

/**
 * Seed: empty project path + default Feature/Policy set (s2-a §7 / plan s2-c).
 * Idempotent via global_settings marker `storage.seed.v1`.
 */
export async function seedSqliteDefaults(
  storage: ClimeStorage,
  db: ClimeSqliteDatabase,
): Promise<SeedResult> {
  const marker = await storage.settings.getGlobal(SEED_MARKER_KEY);
  if (marker) {
    return {
      alreadySeeded: true,
      emptyProjectId: SEED_IDS.emptyProject,
      featureCount: DEFAULT_FEATURES.length,
      policyCount: 2,
    };
  }

  const now = nowIso();
  const existingProject = await storage.projects.getById(SEED_IDS.emptyProject);
  if (!existingProject) {
    await db.insert(project).values({
      id: SEED_IDS.emptyProject,
      name: EMPTY_PROJECT_NAME,
      status: "active",
      metaJson: envelopeJson({ seed: true, empty: true }),
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const feature of DEFAULT_FEATURES) {
    await storage.features.put({
      id: feature.id,
      featureKey: feature.featureKey,
      scope: "global",
      scopeId: null,
      lifecycle: feature.lifecycle,
    });
  }

  await storage.policies.putRule({
    id: SEED_IDS.policyBaseline,
    featureKey: null,
    scope: "global",
    scopeId: null,
    ruleJson: baselinePolicyRuleJson(),
    enabled: 1,
  });

  await storage.policies.putRule({
    id: SEED_IDS.policyPublishValidate,
    featureKey: "feature.publish.api",
    scope: "global",
    scopeId: null,
    ruleJson: publishValidatePolicyRuleJson(),
    enabled: 1,
  });

  await storage.policies.setKillSwitch({
    id: SEED_IDS.killSwitchGlobal,
    scope: "global",
    scopeId: null,
    active: 0,
    reason: null,
    activatedAt: null,
  });

  await storage.settings.putGlobal(SEED_MARKER_KEY, seedMarkerValueJson());

  return {
    alreadySeeded: false,
    emptyProjectId: SEED_IDS.emptyProject,
    featureCount: DEFAULT_FEATURES.length,
    policyCount: 2,
  };
}
