import { SCHEMA_VERSION } from "@clime/shared";
import type { GovernanceAPI } from "@clime/feature-management";

type ArgRecord = Record<string, unknown>;

type GovernanceDomainHandler = (
  args: ArgRecord,
  context: {
    requestId: string;
    traceId: string;
    projectId?: string | null;
  },
) => Promise<unknown>;

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

/**
 * Maps `domain:governance.*` IPC handlers 1:1 onto S25A GovernanceAPI.
 * Admit stays host-pipeline internal — not exposed as a DomainClient method.
 */
export function createGovernanceDomainHandlers(
  api: GovernanceAPI,
): Record<string, GovernanceDomainHandler> {
  return {
    "governance.getFeatures": async (args: ArgRecord) => ({
      schema_version: SCHEMA_VERSION,
      features: await api.getFeatures({
        scope: args.scope as Parameters<GovernanceAPI["getFeatures"]>[0]["scope"],
        scopeId: asNullableString(args.scopeId),
      }),
    }),

    "governance.getPolicies": async (args: ArgRecord) => ({
      schema_version: SCHEMA_VERSION,
      policies: await api.getPolicies({
        scope: typeof args.scope === "string" ? args.scope : undefined,
        scopeId: asNullableString(args.scopeId),
      }),
    }),

    "governance.getKillSwitch": async (args: ArgRecord) => ({
      schema_version: SCHEMA_VERSION,
      killSwitch: await api.getKillSwitch({
        scope: asString(args.scope, "global"),
        scopeId: asNullableString(args.scopeId),
      }),
    }),

    "governance.getRuntimeStatus": async (args: ArgRecord) => ({
      schema_version: SCHEMA_VERSION,
      status: await api.getRuntimeStatus({
        projectId: asNullableString(args.projectId),
      }),
    }),

    "governance.setFeature": async (args: ArgRecord, ctx) => {
      const result = await api.setFeature({
        featureKey: asString(args.featureKey),
        scope: args.scope as Parameters<GovernanceAPI["setFeature"]>[0]["scope"],
        scopeId: asNullableString(args.scopeId),
        lifecycle: args.lifecycle as Parameters<GovernanceAPI["setFeature"]>[0]["lifecycle"],
        actor: asNullableString(args.actor),
        traceId: asString(args.traceId, ctx.traceId),
      });
      return { schema_version: SCHEMA_VERSION, ...result, updated: true };
    },

    "governance.setPolicy": async (args: ArgRecord, ctx) => {
      const result = await api.setPolicy({
        id: typeof args.id === "string" ? args.id : undefined,
        featureKey: asNullableString(args.featureKey),
        scope: asString(args.scope, "global"),
        scopeId: asNullableString(args.scopeId),
        ruleJson: asString(args.ruleJson, "{}"),
        enabled: typeof args.enabled === "boolean" ? args.enabled : true,
        actor: asNullableString(args.actor),
        traceId: asString(args.traceId, ctx.traceId),
      });
      return { schema_version: SCHEMA_VERSION, ...result, updated: true };
    },

    "governance.activateKillSwitch": async (args: ArgRecord, ctx) => {
      const result = await api.activateKillSwitch({
        scope: asString(args.scope, "global"),
        scopeId: asNullableString(args.scopeId),
        reason: asString(args.reason, "activated via Domain API"),
        actor: asNullableString(args.actor),
        traceId: asString(args.traceId, ctx.traceId),
        projectId: asNullableString(args.projectId) ?? ctx.projectId,
      });
      return { schema_version: SCHEMA_VERSION, active: true, ...result };
    },

    "governance.clearKillSwitch": async (args: ArgRecord, ctx) => {
      await api.clearKillSwitch({
        scope: asString(args.scope, "global"),
        scopeId: asNullableString(args.scopeId),
        actor: asNullableString(args.actor),
        traceId: asString(args.traceId, ctx.traceId),
      });
      return { schema_version: SCHEMA_VERSION, active: false };
    },
  };
}

export function isFullGovernanceAPI(
  api: Pick<GovernanceAPI, "admit"> | GovernanceAPI,
): api is GovernanceAPI {
  return (
    "setFeature" in api &&
    typeof (api as GovernanceAPI).setFeature === "function" &&
    "activateKillSwitch" in api &&
    typeof (api as GovernanceAPI).activateKillSwitch === "function"
  );
}
