import { mkdir, readFile, writeFile, unlink, rename } from "node:fs/promises";
import { join } from "node:path";
import { SCHEMA_VERSION, withSchemaVersion } from "@clime/shared";
import type { MasterKeyProvider, Vault, VaultPutInput } from "./types.js";
import {
  VaultEmptySecretError,
  VaultNotFoundError,
  VaultRefError,
} from "./errors.js";
import {
  vaultRefSchema,
  secretKindSchema,
  vaultIndexFileSchema,
  type VaultIndexEntry,
  type VaultIndexFile,
} from "./schemas.js";
import { encryptAesGcm, decryptAesGcm } from "./crypto.js";
import { newVaultId, toVaultRef, vaultRefToId } from "./ids.js";

const INDEX_FILE = "index.json";
const BLOBS_DIR = "blobs";

export type EncryptedFileVaultOptions = {
  rootDir: string;
  masterKeyProvider: MasterKeyProvider;
};

/**
 * AES-256-GCM encrypted vault directory.
 * Layout: `<rootDir>/index.json` + `<rootDir>/blobs/<id>.bin`
 * Never stores plaintext secrets.
 */
export function createEncryptedFileVault(
  options: EncryptedFileVaultOptions,
): Vault {
  const { rootDir, masterKeyProvider } = options;
  const indexPath = join(rootDir, INDEX_FILE);
  const blobsDir = join(rootDir, BLOBS_DIR);

  let writeChain: Promise<void> = Promise.resolve();

  function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = writeChain.then(fn, fn);
    writeChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  function assertPlaintext(plaintext: string): void {
    if (plaintext.length === 0) throw new VaultEmptySecretError();
  }

  function parseRef(ref: string): string {
    const parsed = vaultRefSchema.safeParse(ref);
    if (!parsed.success) throw new VaultRefError(parsed.error.message);
    return parsed.data;
  }

  async function ensureDirs(): Promise<void> {
    await mkdir(blobsDir, { recursive: true });
  }

  async function readIndex(): Promise<VaultIndexFile> {
    try {
      const raw = await readFile(indexPath, "utf8");
      return vaultIndexFileSchema.parse(JSON.parse(raw) as unknown);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return withSchemaVersion({ entries: [] }) as VaultIndexFile;
      }
      throw err;
    }
  }

  async function writeIndex(index: VaultIndexFile): Promise<void> {
    const tmp = `${indexPath}.tmp`;
    const payload = vaultIndexFileSchema.parse(
      withSchemaVersion({ entries: index.entries }),
    );
    await writeFile(tmp, JSON.stringify(payload, null, 2), "utf8");
    await rename(tmp, indexPath);
  }

  function blobPath(id: string): string {
    return join(blobsDir, `${id}.bin`);
  }

  async function writeBlob(id: string, plaintext: string): Promise<void> {
    const key = await masterKeyProvider.getMasterKey();
    const cipher = encryptAesGcm(key, plaintext);
    const tmp = `${blobPath(id)}.tmp`;
    await writeFile(tmp, cipher);
    await rename(tmp, blobPath(id));
  }

  async function readBlob(id: string): Promise<string> {
    const key = await masterKeyProvider.getMasterKey();
    const cipher = await readFile(blobPath(id));
    return decryptAesGcm(key, cipher);
  }

  return {
    putSecret(input: VaultPutInput) {
      return enqueue(async () => {
        assertPlaintext(input.plaintext);
        secretKindSchema.parse(input.kind);
        await ensureDirs();

        const id = input.id?.trim() || newVaultId();
        if (!/^[A-Za-z0-9_-]+$/.test(id)) {
          throw new VaultRefError("id must match [A-Za-z0-9_-]+");
        }
        const ref = toVaultRef(id);
        const now = new Date().toISOString();
        const index = await readIndex();
        const existingIdx = index.entries.findIndex((e) => e.ref === ref);

        await writeBlob(id, input.plaintext);

        const entry: VaultIndexEntry = {
          schema_version: SCHEMA_VERSION,
          ref,
          kind: input.kind,
          createdAt:
            existingIdx >= 0
              ? (index.entries[existingIdx]?.createdAt ?? now)
              : now,
          updatedAt: now,
          blobFile: `${BLOBS_DIR}/${id}.bin`,
          ...(input.meta ? { meta: input.meta } : {}),
        };

        if (existingIdx >= 0) {
          index.entries[existingIdx] = entry;
        } else {
          index.entries.push(entry);
        }
        await writeIndex(index);
        return { ref };
      });
    },

    getSecret(ref) {
      return enqueue(async () => {
        const key = parseRef(ref);
        const index = await readIndex();
        const entry = index.entries.find((e) => e.ref === key);
        if (!entry) throw new VaultNotFoundError(key);
        return readBlob(vaultRefToId(key));
      });
    },

    hasSecret(ref) {
      return enqueue(async () => {
        const key = parseRef(ref);
        const index = await readIndex();
        return index.entries.some((e) => e.ref === key);
      });
    },

    deleteSecret(ref) {
      return enqueue(async () => {
        const key = parseRef(ref);
        await ensureDirs();
        const index = await readIndex();
        const next = index.entries.filter((e) => e.ref !== key);
        if (next.length === index.entries.length) return;
        try {
          await unlink(blobPath(vaultRefToId(key)));
        } catch (err) {
          const code = (err as NodeJS.ErrnoException).code;
          if (code !== "ENOENT") throw err;
        }
        await writeIndex(withSchemaVersion({ entries: next }) as VaultIndexFile);
      });
    },

    rotateSecret(ref, plaintext) {
      return enqueue(async () => {
        assertPlaintext(plaintext);
        const key = parseRef(ref);
        await ensureDirs();
        const index = await readIndex();
        const existingIdx = index.entries.findIndex((e) => e.ref === key);
        if (existingIdx < 0) throw new VaultNotFoundError(key);

        const id = vaultRefToId(key);
        await writeBlob(id, plaintext);
        const prev = index.entries[existingIdx]!;
        index.entries[existingIdx] = {
          ...prev,
          updatedAt: new Date().toISOString(),
        };
        await writeIndex(index);
        return { ref: key };
      });
    },
  };
}
