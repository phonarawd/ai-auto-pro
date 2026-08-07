/**
 * @clime/config — versioned values cascade (Global→Project→User).
 * Not Governance. Secrets = VaultRef only.
 */

export type {
  CascadeContext,
  ConfigStore,
  ConfigStoreDeps,
  ConfigValueEnvelope,
} from "./types.js";

export {
  configValueEnvelopeSchema,
  userPrefsConfigSchema,
  type UserPrefsConfig,
} from "./schemas.js";

export {
  ConfigError,
  ConfigForbiddenKeyError,
  ConfigSecretRejectedError,
  ConfigScopeError,
} from "./errors.js";

export {
  assertConfigKeyAllowed,
  isGovernanceReservedKey,
  isWorkspaceOrTeamKey,
} from "./forbidden-keys.js";

export { assertNotPlaintextSecret } from "./secret-heuristic.js";

export {
  createConfigStore,
  configValue,
  configRef,
} from "./create-config-store.js";

export {
  createSettingsDomainHandlers,
  type SettingsDomainHandlerOptions,
} from "./api.js";
