import type { VaultRef, SecretKind } from "./schemas.js";

export type { VaultRef, SecretKind };

export type VaultPutInput = {
  /** Optional stable id fragment; if omitted, vault generates one. */
  id?: string;
  kind: SecretKind;
  plaintext: string;
  meta?: Record<string, unknown>;
};

export type Vault = {
  putSecret(input: VaultPutInput): Promise<{ ref: VaultRef }>;
  getSecret(ref: VaultRef): Promise<string>;
  hasSecret(ref: VaultRef): Promise<boolean>;
  deleteSecret(ref: VaultRef): Promise<void>;
  /** Replaces material at same ref id (ciphertext rotated). */
  rotateSecret(ref: VaultRef, plaintext: string): Promise<{ ref: VaultRef }>;
};

export type MasterKeyProvider = {
  /** Returns 32-byte key material for AES-256-GCM. */
  getMasterKey(): Promise<Buffer>;
};
