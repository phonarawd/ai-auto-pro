import { createEncryptedFileVault } from "./encrypted-file-vault.js";
import { createMemoryVault } from "./memory-vault.js";
import type { MasterKeyProvider, Vault } from "./types.js";

export type CreateVaultOptions =
  | { backend: "memory" }
  | {
      backend: "encrypted-file";
      rootDir: string;
      masterKeyProvider: MasterKeyProvider;
    };

/** Factory — product default must be encrypted-file (not memory). */
export function createVault(options: CreateVaultOptions): Vault {
  if (options.backend === "memory") {
    return createMemoryVault();
  }
  return createEncryptedFileVault({
    rootDir: options.rootDir,
    masterKeyProvider: options.masterKeyProvider,
  });
}
