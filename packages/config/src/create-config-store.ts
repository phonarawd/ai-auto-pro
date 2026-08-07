import { SCHEMA_VERSION, withSchemaVersion } from "@clime/shared";
import type { SettingsScope } from "@clime/shared";
import {
  ConfigScopeError,
} from "./errors.js";
import { assertConfigKeyAllowed } from "./forbidden-keys.js";
import {
  configValueEnvelopeSchema,
  userPrefsConfigSchema,
  type ConfigValueEnvelope,
  type UserPrefsConfig,
} from "./schemas.js";
import { assertNotPlaintextSecret } from "./secret-heuristic.js";
import type { CascadeContext, ConfigStore, ConfigStoreDeps } from "./types.js";

function requireScopeId(scope: SettingsScope, scopeId?: string): string {
  if (scope === "global") return "";
  if (!scopeId || scopeId.trim().length === 0) {
    throw new ConfigScopeError(
      `scope "${scope}" requires scopeId (projectId or userKey)`,
    );
  }
  return scopeId;
}

function parseEnvelope(raw: string): ConfigValueEnvelope | null {
  try {
    return configValueEnvelopeSchema.parse(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function serializeEnvelope(envelope: ConfigValueEnvelope): string {
  return JSON.stringify(configValueEnvelopeSchema.parse(envelope));
}

function parseUserPrefs(raw: string | null | undefined): UserPrefsConfig {
  if (!raw) {
    return withSchemaVersion({ values: {} }) as UserPrefsConfig;
  }
  try {
    return userPrefsConfigSchema.parse(JSON.parse(raw) as unknown);
  } catch {
    return withSchemaVersion({ values: {} }) as UserPrefsConfig;
  }
}

function validateEnvelope(key: string, envelope: ConfigValueEnvelope): void {
  const parsed = configValueEnvelopeSchema.parse(envelope);
  if (parsed.kind === "value") {
    assertNotPlaintextSecret(key, parsed.value);
  }
}

export function createConfigStore(deps: ConfigStoreDeps): ConfigStore {
  const { settings } = deps;

  return {
    async set(input) {
      assertConfigKeyAllowed(input.key);
      validateEnvelope(input.key, input.envelope);
      const envelope = configValueEnvelopeSchema.parse(input.envelope);
      const scopeId = requireScopeId(input.scope, input.scopeId);

      if (input.scope === "global") {
        await settings.putGlobal(input.key, serializeEnvelope(envelope));
        return;
      }

      if (input.scope === "project") {
        await settings.putProject(
          scopeId,
          input.key,
          serializeEnvelope(envelope),
        );
        return;
      }

      // user — merge into prefsJson.values map
      const existing = await settings.getUserPrefs(scopeId);
      const prefs = parseUserPrefs(existing?.prefsJson);
      const next = withSchemaVersion({
        values: {
          ...prefs.values,
          [input.key]: envelope,
        },
      });
      await settings.putUserPrefs(
        scopeId,
        JSON.stringify(userPrefsConfigSchema.parse(next)),
      );
    },

    async get(input) {
      assertConfigKeyAllowed(input.key);
      const scopeId = requireScopeId(input.scope, input.scopeId);

      if (input.scope === "global") {
        const row = await settings.getGlobal(input.key);
        return row ? parseEnvelope(row.valueJson) : null;
      }

      if (input.scope === "project") {
        const row = await settings.getProject(scopeId, input.key);
        return row ? parseEnvelope(row.valueJson) : null;
      }

      const prefsRow = await settings.getUserPrefs(scopeId);
      const prefs = parseUserPrefs(prefsRow?.prefsJson);
      return prefs.values[input.key] ?? null;
    },

    async getEffective(key, ctx: CascadeContext) {
      assertConfigKeyAllowed(key);

      if (ctx.userKey) {
        const userVal = await this.get({
          key,
          scope: "user",
          scopeId: ctx.userKey,
        });
        if (userVal) return { envelope: userVal, source: "user" };
      }

      if (ctx.projectId) {
        const projectVal = await this.get({
          key,
          scope: "project",
          scopeId: ctx.projectId,
        });
        if (projectVal) return { envelope: projectVal, source: "project" };
      }

      const globalVal = await this.get({ key, scope: "global" });
      if (globalVal) return { envelope: globalVal, source: "global" };

      return null;
    },

    async list(input) {
      const scopeId = requireScopeId(input.scope, input.scopeId);

      if (input.scope === "global") {
        const rows = await settings.listGlobal();
        const out: Array<{ key: string; envelope: ConfigValueEnvelope }> = [];
        for (const row of rows) {
          try {
            assertConfigKeyAllowed(row.key);
          } catch {
            continue;
          }
          const envelope = parseEnvelope(row.valueJson);
          if (envelope) out.push({ key: row.key, envelope });
        }
        return out;
      }

      if (input.scope === "project") {
        const rows = await settings.listProject(scopeId);
        const out: Array<{ key: string; envelope: ConfigValueEnvelope }> = [];
        for (const row of rows) {
          try {
            assertConfigKeyAllowed(row.key);
          } catch {
            continue;
          }
          const envelope = parseEnvelope(row.valueJson);
          if (envelope) out.push({ key: row.key, envelope });
        }
        return out;
      }

      const prefsRow = await settings.getUserPrefs(scopeId);
      const prefs = parseUserPrefs(prefsRow?.prefsJson);
      const out: Array<{ key: string; envelope: ConfigValueEnvelope }> = [];
      for (const [key, envelope] of Object.entries(prefs.values)) {
        try {
          assertConfigKeyAllowed(key);
        } catch {
          continue;
        }
        out.push({ key, envelope });
      }
      return out;
    },
  };
}

/** Helper for tests / callers building value envelopes. */
export function configValue(value: unknown): ConfigValueEnvelope {
  return {
    schema_version: SCHEMA_VERSION,
    kind: "value",
    value,
  };
}

/** Helper for vault ref envelopes. */
export function configRef(ref: string): ConfigValueEnvelope {
  return configValueEnvelopeSchema.parse({
    schema_version: SCHEMA_VERSION,
    kind: "ref",
    ref,
  });
}
