export class ConfigError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ConfigError";
    this.code = code;
  }
}

export class ConfigForbiddenKeyError extends ConfigError {
  constructor(key: string) {
    super(
      "CONFIG_FORBIDDEN_KEY",
      `Config key "${key}" is reserved for Governance / Capability — Config ≠ Governance`,
    );
    this.name = "ConfigForbiddenKeyError";
  }
}

export class ConfigSecretRejectedError extends ConfigError {
  constructor(detail: string) {
    super(
      "CONFIG_SECRET_REJECTED",
      `Config rejects plaintext secrets — use VaultRef (kind: "ref"). ${detail}`,
    );
    this.name = "ConfigSecretRejectedError";
  }
}

export class ConfigScopeError extends ConfigError {
  constructor(message: string) {
    super("CONFIG_SCOPE_INVALID", message);
    this.name = "ConfigScopeError";
  }
}
