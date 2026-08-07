/**
 * @clime/vault — secrets at rest (encrypted file / keychain master key).
 * Config and Storage hold VaultRef only — never plaintext.
 */

export type { Vault, VaultPutInput, MasterKeyProvider, VaultRef, SecretKind } from "./types.js";

export {
  vaultRefSchema,
  secretKindSchema,
  vaultIndexEntrySchema,
  vaultIndexFileSchema,
  type VaultIndexEntry,
  type VaultIndexFile,
} from "./schemas.js";

export {
  VaultError,
  VaultRefError,
  VaultNotFoundError,
  VaultEmptySecretError,
} from "./errors.js";

export {
  createEphemeralMasterKeyProvider,
  createFileMasterKeyProvider,
  createOsKeychainMasterKeyProvider,
} from "./master-key.js";

export { createMemoryVault } from "./memory-vault.js";
export { createEncryptedFileVault } from "./encrypted-file-vault.js";
export { createVault, type CreateVaultOptions } from "./create-vault.js";
