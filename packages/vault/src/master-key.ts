import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile, chmod } from "node:fs/promises";
import { dirname } from "node:path";
import type { MasterKeyProvider } from "./types.js";
import { VaultError } from "./errors.js";

const KEY_BYTES = 32;

/** Tests only — ephemeral random key (lost on process exit). */
export function createEphemeralMasterKeyProvider(): MasterKeyProvider {
  const key = randomBytes(KEY_BYTES);
  return {
    async getMasterKey() {
      return Buffer.from(key);
    },
  };
}

/**
 * Local file-backed master key under a gitignored path (e.g. `.vault/master.key`).
 * Creates the key file if missing. Never commit this path.
 */
export function createFileMasterKeyProvider(path: string): MasterKeyProvider {
  let cached: Buffer | null = null;

  return {
    async getMasterKey() {
      if (cached) return Buffer.from(cached);

      try {
        const raw = await readFile(path);
        if (raw.length !== KEY_BYTES) {
          throw new VaultError(
            "VAULT_MASTER_KEY_INVALID",
            "master key file must be 32 bytes",
          );
        }
        cached = raw;
        return Buffer.from(cached);
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code !== "ENOENT") throw err;

        await mkdir(dirname(path), { recursive: true });
        const key = randomBytes(KEY_BYTES);
        await writeFile(path, key);
        try {
          await chmod(path, 0o600);
        } catch {
          // Windows may ignore chmod — acceptable for V1 local vault.
        }
        cached = key;
        return Buffer.from(cached);
      }
    },
  };
}

/**
 * OS keychain-shaped provider. V1 derives a stable key from service+account
 * via SHA-256 when a native keychain module is not wired (desktop K2).
 * Product desktop may replace this with Electron safeStorage / keytar later
 * without changing Vault consumers.
 */
export function createOsKeychainMasterKeyProvider(
  service: string,
  account: string,
): MasterKeyProvider {
  if (!service.trim() || !account.trim()) {
    throw new VaultError(
      "VAULT_KEYCHAIN_ARGS",
      "service and account are required",
    );
  }

  const material = createHash("sha256")
    .update(`clime-vault|${service}|${account}`, "utf8")
    .digest();

  return {
    async getMasterKey() {
      return Buffer.from(material);
    },
  };
}
