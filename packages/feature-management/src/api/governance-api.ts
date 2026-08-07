import type { FeatureLifecycle, SettingsScope } from "@clime/shared";
import { featureLifecycleSchema, settingsScopeSchema } from "@clime/shared";
import type { FeatureManagementDeps } from "../persist/ports.js";
import { noopEventSink } from "../persist/ports.js";
import { admit as admitCommand } from "../runtime/admit.js";
import {
  defaultCountActiveRuns,
  isKillSwitchActive,
} from "../runtime/governor.js";
import {
  activateKillSwitch,
  clearKillSwitch,
} from "../kill-switch/activate.js";
import { parsePolicyRuleJson } from "../zod/policy-rule.js";
import type {
  AdmitDecision,
  AdmitInput,
  FeatureStateView,
  KillSwitchView,
  PolicyRuleView,
  RuntimeStatusView,
} from "../types.js";

/**
 * GovernanceAPI surface (RFC 13 / S25A §5).
 * Domain API (slice 3) wraps these methods; UI mutations must go through here.
 */
export type GovernanceAPI = {
  getFeatures(input: {
    scope?: SettingsScope;
    scopeId?: string | null;
  }): Promise<FeatureStateView[]>;
  getPolicies(input: {
    scope?: string;
    scopeId?: string | null;
  }): Promise<PolicyRuleView[]>;
  getKillSwitch(input: {
    scope: string;
    scopeId?: string | null;
  }): Promise<KillSwitchView | null>;
  getRuntimeStatus(input: {
    projectId?: string | null;
  }): Promise<RuntimeStatusView>;
  setFeature(input: {
    featureKey: string;
    scope: SettingsScope;
    scopeId?: string | null;
    lifecycle: FeatureLifecycle;
    actor?: string | null;
    traceId: string;
  }): Promise<{ id: string }>;
  setPolicy(input: {
    id?: string;
    featureKey?: string | null;
    scope: string;
    scopeId?: string | null;
    ruleJson: string;
    enabled: boolean;
    actor?: string | null;
    traceId: string;
  }): Promise<{ id: string }>;
  activateKillSwitch(input: {
    scope: string;
    scopeId?: string | null;
    reason: string;
    actor?: string | null;
    traceId: string;
    projectId?: string | null;
  }): Promise<{
    cancelledWorkflowRunIds: string[];
    cancelledQueueItemIds: string[];
  }>;
  clearKillSwitch(input: {
    scope: string;
    scopeId?: string | null;
    actor?: string | null;
    traceId: string;
  }): Promise<void>;
  admit(input: AdmitInput): Promise<AdmitDecision>;
};

export function createGovernanceAPI(deps: FeatureManagementDeps): GovernanceAPI {
  const events = deps.events ?? noopEventSink;
  const wired: FeatureManagementDeps = { ...deps, events };

  return {
    async getFeatures(input) {
      const rows = await deps.storage.features.list(
        input.scope,
        input.scopeId,
      );
      return rows.map((r) => ({
        id: r.id,
        featureKey: r.featureKey,
        scope: r.scope,
        scopeId: r.scopeId,
        lifecycle: r.lifecycle as FeatureLifecycle,
        updatedAt: r.updatedAt,
      }));
    },

    async getPolicies(input) {
      const rows = await deps.storage.policies.listRules(
        input.scope,
        input.scopeId,
      );
      return rows.map((r) => ({
        id: r.id,
        featureKey: r.featureKey,
        scope: r.scope,
        scopeId: r.scopeId,
        ruleJson: r.ruleJson,
        enabled: r.enabled === 1,
        updatedAt: r.updatedAt,
      }));
    },

    async getKillSwitch(input) {
      const row = await deps.storage.policies.getKillSwitch(
        input.scope,
        input.scopeId,
      );
      if (!row) return null;
      return {
        id: row.id,
        scope: row.scope,
        scopeId: row.scopeId,
        active: row.active === 1,
        reason: row.reason,
        activatedAt: row.activatedAt,
        updatedAt: row.updatedAt,
      };
    },

    async getRuntimeStatus(input) {
      const kill = await isKillSwitchActive(
        deps.storage,
        input.projectId,
      );
      const activeRunCount = deps.governorMetrics
        ? await deps.governorMetrics.countActiveRuns(input.projectId ?? null)
        : await defaultCountActiveRuns(deps.storage, input.projectId ?? null);
      return {
        killSwitchActive: kill.active,
        killSwitchReason: kill.reason,
        activeRunCount,
        schema_version: 1 as const,
      };
    },

    async setFeature(input) {
      settingsScopeSchema.parse(input.scope);
      featureLifecycleSchema.parse(input.lifecycle);
      const result = await deps.storage.features.put({
        featureKey: input.featureKey,
        scope: input.scope,
        scopeId: input.scopeId ?? null,
        lifecycle: input.lifecycle,
      });
      await deps.storage.audit.append({
        projectId: input.scope === "project" ? (input.scopeId ?? null) : null,
        kind: "feature.set",
        actor: input.actor ?? null,
        payloadJson: JSON.stringify({
          schema_version: 1,
          data: {
            featureKey: input.featureKey,
            scope: input.scope,
            scopeId: input.scopeId ?? null,
            lifecycle: input.lifecycle,
          },
        }),
        traceId: input.traceId,
        occurredAt: new Date().toISOString(),
      });
      return result;
    },

    async setPolicy(input) {
      const parsed = parsePolicyRuleJson(input.ruleJson);
      if (!parsed.ok) {
        throw new Error(parsed.message);
      }
      const result = await deps.storage.policies.putRule({
        id: input.id,
        featureKey: input.featureKey ?? null,
        scope: input.scope,
        scopeId: input.scopeId ?? null,
        ruleJson: input.ruleJson,
        enabled: input.enabled ? 1 : 0,
      });
      await deps.storage.audit.append({
        projectId: input.scope === "project" ? (input.scopeId ?? null) : null,
        kind: "policy.set",
        actor: input.actor ?? null,
        payloadJson: JSON.stringify({
          schema_version: 1,
          data: {
            id: result.id,
            featureKey: input.featureKey ?? null,
            scope: input.scope,
          },
        }),
        traceId: input.traceId,
        occurredAt: new Date().toISOString(),
      });
      return result;
    },

    activateKillSwitch(input) {
      return activateKillSwitch(wired, input);
    },

    clearKillSwitch(input) {
      return clearKillSwitch(wired, input);
    },

    admit(input) {
      return admitCommand(wired, input);
    },
  };
}
