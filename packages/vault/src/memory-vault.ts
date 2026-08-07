import type { Vault, VaultPutInput } from "./types.js";
import {
  VaultEmptySecretError,
  VaultNotFoundError,
  VaultRefError,
} from "./errors.js";
import { vaultRefSchema, secretKindSchema } from "./schemas.js";
import { newVaultId, toVaultRef } from "./ids.js";

/** In-process vault for tests only — no disk. */
export function createMemoryVault(): Vault {
  const secrets = new Map<string, { kind: string; plaintext: string; meta?: Record<string, unknown> }>();

  function assertPlaintext(plaintext: string): void {
    if (plaintext.length === 0) throw new VaultEmptySecretError();
  }

  function parseRef(ref: string): string {
    const parsed = vaultRefSchema.safeParse(ref);
    if (!parsed.success) throw new VaultRefError(parsed.error.message);
    return parsed.data;
  }

  return {
    async putSecret(input: VaultPutInput) {
      assertPlaintext(input.plaintext);
      secretKindSchema.parse(input.kind);
      const id = input.id?.trim() || newVaultId();
      if (!/^[A-Za-z0-9_-]+$/.test(id)) {
        throw new VaultRefError("id must match [A-Za-z0-9_-]+");
      }
      const ref = toVaultRef(id);
      secrets.set(ref, {
        kind: input.kind,
        plaintext: input.plaintext,
        ...(input.meta ? { meta: input.meta } : {}),
      });
      return { ref };
    },

    async getSecret(ref) {
      const key = parseRef(ref);
      const entry = secrets.get(key);
      if (!entry) throw new VaultNotFoundError(key);
      return entry.plaintext;
    },

    async hasSecret(ref) {
      const key = parseRef(ref);
      return secrets.has(key);
    },

    async deleteSecret(ref) {
      const key = parseRef(ref);
      secrets.delete(key);
    },

    async rotateSecret(ref, plaintext) {
      assertPlaintext(plaintext);
      const key = parseRef(ref);
      const existing = secrets.get(key);
      if (!existing) throw new VaultNotFoundError(key);
      secrets.set(key, { ...existing, plaintext });
      return { ref: key };
    },
  };
}
