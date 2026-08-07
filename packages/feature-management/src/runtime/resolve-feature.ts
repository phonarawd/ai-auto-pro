import type { FeatureLifecycle, SettingsScope } from "@clime/shared";
import type { FeatureManagementStorage } from "../persist/ports.js";

export type ResolvedFeature = {
  featureKey: string;
  lifecycle: FeatureLifecycle;
  scope: SettingsScope;
  scopeId: string | null;
};

/**
 * Effective Feature = most specific winning scope (user > project > global).
 * Missing entirely → fail closed as disabled.
 */
export async function resolveFeatureLifecycle(
  storage: FeatureManagementStorage,
  featureKey: string,
  projectId?: string | null,
  userKey?: string | null,
): Promise<ResolvedFeature> {
  if (userKey) {
    const userRow = await storage.features.get(featureKey, "user", userKey);
    if (userRow) {
      return {
        featureKey,
        lifecycle: userRow.lifecycle as FeatureLifecycle,
        scope: "user",
        scopeId: userKey,
      };
    }
  }

  if (projectId) {
    const projectRow = await storage.features.get(
      featureKey,
      "project",
      projectId,
    );
    if (projectRow) {
      return {
        featureKey,
        lifecycle: projectRow.lifecycle as FeatureLifecycle,
        scope: "project",
        scopeId: projectId,
      };
    }
  }

  const globalRow = await storage.features.get(featureKey, "global", null);
  if (globalRow) {
    return {
      featureKey,
      lifecycle: globalRow.lifecycle as FeatureLifecycle,
      scope: "global",
      scopeId: null,
    };
  }

  return {
    featureKey,
    lifecycle: "disabled",
    scope: "global",
    scopeId: null,
  };
}

export function featureLifecycleAllows(lifecycle: FeatureLifecycle): boolean {
  return (
    lifecycle === "enabled" ||
    lifecycle === "experimental" ||
    lifecycle === "beta"
  );
}
