import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createEncryptedFileVault,
  createEphemeralMasterKeyProvider,
  createFileMasterKeyProvider,
  createMemoryVault,
  createOsKeychainMasterKeyProvider,
  createVault,
  VaultEmptySecretError,
  VaultNotFoundError,
  VaultRefError,
} from "./index.js";

const temps: string[] = [];

afterEach(async () => {
  await Promise.all(
    temps.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function tempVaultRoot(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "clime-vault-"));
  temps.push(dir);
  return dir;
}

describe("@clime/vault memory", () => {
  it("put/get/rotate/delete with opaque VaultRef", async () => {
    const vault = createMemoryVault();
    const { ref } = await vault.putSecret({
      kind: "api_key",
      plaintext: "sk-test-secret-value",
    });
    expect(ref).toMatch(/^vault:[A-Za-z0-9_-]+$/);
    expect(ref).not.toContain("sk-test");
    expect(await vault.getSecret(ref)).toBe("sk-test-secret-value");
    await vault.rotateSecret(ref, "sk-rotated");
    expect(await vault.getSecret(ref)).toBe("sk-rotated");
    await vault.deleteSecret(ref);
    expect(await vault.hasSecret(ref)).toBe(false);
  });

  it("rejects empty plaintext and bad refs", async () => {
    const vault = createMemoryVault();
    await expect(
      vault.putSecret({ kind: "other", plaintext: "" }),
    ).rejects.toBeInstanceOf(VaultEmptySecretError);
    await expect(vault.getSecret("not-a-ref")).rejects.toBeInstanceOf(
      VaultRefError,
    );
    await expect(vault.getSecret("vault:missing")).rejects.toBeInstanceOf(
      VaultNotFoundError,
    );
  });
});

describe("@clime/vault encrypted-file", () => {
  it("persists ciphertext only — no plaintext on disk", async () => {
    const root = await tempVaultRoot();
    const vault = createEncryptedFileVault({
      rootDir: root,
      masterKeyProvider: createEphemeralMasterKeyProvider(),
    });

    const secret = "super-secret-session-cookie-abc123";
    const { ref } = await vault.putSecret({
      id: "sess1",
      kind: "session",
      plaintext: secret,
    });
    expect(ref).toBe("vault:sess1");
    expect(await vault.getSecret(ref)).toBe(secret);

    const indexRaw = await readFile(join(root, "index.json"), "utf8");
    expect(indexRaw).toContain("schema_version");
    expect(indexRaw).not.toContain(secret);

    const blob = await readFile(join(root, "blobs", "sess1.bin"));
    expect(blob.toString("utf8")).not.toContain(secret);
    expect(blob.includes(Buffer.from(secret, "utf8"))).toBe(false);

    const files = await readdir(root);
    expect(files).toContain("index.json");
    expect(files).toContain("blobs");
  });

  it("file master key provider creates key under vault root", async () => {
    const root = await tempVaultRoot();
    const keyPath = join(root, "master.key");
    const provider = createFileMasterKeyProvider(keyPath);
    const vault = createVault({
      backend: "encrypted-file",
      rootDir: join(root, "data"),
      masterKeyProvider: provider,
    });
    const { ref } = await vault.putSecret({
      kind: "oauth",
      plaintext: "refresh-token-xyz",
    });
    expect(await vault.getSecret(ref)).toBe("refresh-token-xyz");
    const keyBytes = await readFile(keyPath);
    expect(keyBytes.length).toBe(32);
  });

  it("os keychain-shaped provider yields stable decrypt", async () => {
    const root = await tempVaultRoot();
    const provider = createOsKeychainMasterKeyProvider(
      "clime.ai.growth-studio",
      "local-user",
    );
    const vault = createEncryptedFileVault({
      rootDir: root,
      masterKeyProvider: provider,
    });
    const { ref } = await vault.putSecret({
      kind: "api_key",
      plaintext: "provider-key-material",
    });

    const vault2 = createEncryptedFileVault({
      rootDir: root,
      masterKeyProvider: createOsKeychainMasterKeyProvider(
        "clime.ai.growth-studio",
        "local-user",
      ),
    });
    expect(await vault2.getSecret(ref)).toBe("provider-key-material");
  });
});
