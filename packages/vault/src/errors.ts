export class VaultError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "VaultError";
    this.code = code;
  }
}

export class VaultRefError extends VaultError {
  constructor(message: string) {
    super("VAULT_REF_INVALID", message);
    this.name = "VaultRefError";
  }
}

export class VaultNotFoundError extends VaultError {
  constructor(ref: string) {
    super("VAULT_NOT_FOUND", `Secret not found for ref ${ref}`);
    this.name = "VaultNotFoundError";
  }
}

export class VaultEmptySecretError extends VaultError {
  constructor() {
    super("VAULT_EMPTY_SECRET", "plaintext must be non-empty");
    this.name = "VaultEmptySecretError";
  }
}
