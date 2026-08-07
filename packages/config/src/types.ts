import type { SettingsScope } from "@clime/shared";
import type { SettingsRepository } from "@clime/storage";
import type { ConfigValueEnvelope } from "./schemas.js";

export type { ConfigValueEnvelope };

export type CascadeContext = {
  projectId?: string | null;
  userKey?: string | null;
};

export type ConfigStore = {
  set(input: {
    key: string;
    scope: SettingsScope;
    scopeId?: string;
    envelope: ConfigValueEnvelope;
  }): Promise<void>;

  get(input: {
    key: string;
    scope: SettingsScope;
    scopeId?: string;
  }): Promise<ConfigValueEnvelope | null>;

  getEffective(
    key: string,
    ctx: CascadeContext,
  ): Promise<{
    envelope: ConfigValueEnvelope;
    source: SettingsScope;
  } | null>;

  /** List keys stored at a single cascade layer (not effective merge). */
  list(input: {
    scope: SettingsScope;
    scopeId?: string;
  }): Promise<Array<{ key: string; envelope: ConfigValueEnvelope }>>;
};

export type ConfigStoreDeps = {
  settings: SettingsRepository;
};
