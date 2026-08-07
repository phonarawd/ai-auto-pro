import type { SettingsScope } from "@clime/shared";
import { SCHEMA_VERSION } from "@clime/shared";
import {
  ConfigForbiddenKeyError,
  ConfigScopeError,
  ConfigSecretRejectedError,
} from "./errors.js";
import { isWorkspaceOrTeamKey } from "./forbidden-keys.js";
import { configValue } from "./create-config-store.js";
import type { ConfigStore, ConfigValueEnvelope } from "./types.js";

type ArgRecord = Record<string, unknown>;

type DomainHandler = (
  args: ArgRecord,
  context: {
    requestId: string;
    traceId: string;
    projectId?: string | null;
  },
) => Promise<unknown>;

export type SettingsDomainHandlerOptions = {
  defaultProjectId?: string;
  defaultUserKey?: string;
};

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function envelopeView(envelope: ConfigValueEnvelope) {
  if (envelope.kind === "ref") {
    return { kind: "ref" as const, ref: envelope.ref };
  }
  return { kind: "value" as const, value: envelope.value };
}

function failSave(code: string, message: string) {
  return {
    schema_version: SCHEMA_VERSION,
    saved: false as const,
    code,
    message,
  };
}

async function listScope(
  store: ConfigStore,
  scope: SettingsScope,
  scopeId: string | undefined,
  cascade: { projectId?: string; userKey?: string },
) {
  const items = await store.list({ scope, scopeId });
  const views = await Promise.all(
    items.map(async ({ key, envelope }) => {
      const effective = await store.getEffective(key, cascade);
      return {
        key,
        ...envelopeView(envelope),
        effectiveSource: effective?.source ?? scope,
      };
    }),
  );
  return {
    schema_version: SCHEMA_VERSION,
    scope,
    items: views,
  };
}

async function setScope(
  store: ConfigStore,
  scope: SettingsScope,
  scopeId: string | undefined,
  key: string,
  value: unknown,
) {
  if (!key.trim()) {
    return failSave("INVALID_KEY", "key required");
  }
  if (isWorkspaceOrTeamKey(key)) {
    return failSave(
      "WORKSPACE_FORBIDDEN",
      "Workspace/Team Mode settings are not available until Team Mode (L+)",
    );
  }
  try {
    const envelope =
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      "kind" in (value as Record<string, unknown>) &&
      ((value as { kind?: unknown }).kind === "value" ||
        (value as { kind?: unknown }).kind === "ref")
        ? (value as ConfigValueEnvelope)
        : configValue(value);
    await store.set({ key, scope, scopeId, envelope });
    return { schema_version: SCHEMA_VERSION, saved: true as const, key, scope };
  } catch (err) {
    if (err instanceof ConfigForbiddenKeyError) {
      if (isWorkspaceOrTeamKey(key)) {
        return failSave(
          "WORKSPACE_FORBIDDEN",
          "Workspace/Team Mode settings are not available until Team Mode (L+)",
        );
      }
      return failSave("FORBIDDEN_KEY", err.message);
    }
    if (err instanceof ConfigSecretRejectedError) {
      return failSave("SECRET_REJECTED", err.message);
    }
    if (err instanceof ConfigScopeError) {
      return failSave("SCOPE_ERROR", err.message);
    }
    throw err;
  }
}

/**
 * SettingsAPI handlers — Global→Project→User cascade via `@clime/config`.
 * Workspace/Team Mode keys rejected. Config ≠ Governance.
 */
export function createSettingsDomainHandlers(
  store: ConfigStore,
  options?: SettingsDomainHandlerOptions,
): Record<string, DomainHandler> {
  const defaultProjectId = options?.defaultProjectId;
  const defaultUserKey = options?.defaultUserKey ?? "local";

  const resolveProjectId = (
    args: ArgRecord,
    ctx: { projectId?: string | null },
  ) => asString(args.projectId, ctx.projectId ?? defaultProjectId ?? "");

  const resolveUserKey = (args: ArgRecord) =>
    asString(args.userKey, defaultUserKey);

  return {
    "settings.getGlobal": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx) || undefined;
      const userKey = resolveUserKey(args);
      return listScope(store, "global", undefined, { projectId, userKey });
    },

    "settings.setGlobal": async (args) => {
      return setScope(store, "global", undefined, asString(args.key), args.value);
    },

    "settings.getProject": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      if (!projectId) {
        return {
          schema_version: SCHEMA_VERSION,
          scope: "project" as const,
          items: [],
          errors: ["projectId required"],
        };
      }
      return listScope(store, "project", projectId, {
        projectId,
        userKey: resolveUserKey(args),
      });
    },

    "settings.setProject": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      if (!projectId) {
        return failSave("SCOPE_ERROR", "projectId required");
      }
      return setScope(
        store,
        "project",
        projectId,
        asString(args.key),
        args.value,
      );
    },

    "settings.getUser": async (args, ctx) => {
      const userKey = resolveUserKey(args);
      const projectId = resolveProjectId(args, ctx) || undefined;
      return listScope(store, "user", userKey, { projectId, userKey });
    },

    "settings.setUser": async (args) => {
      const userKey = resolveUserKey(args);
      return setScope(store, "user", userKey, asString(args.key), args.value);
    },
  };
}
