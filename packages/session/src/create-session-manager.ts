import {
  SYSTEM_EVENT_TYPES,
  createBusEnvelope,
} from "@clime/event-bus";
import { SCHEMA_VERSION } from "@clime/shared";
import { vaultRefSchema } from "@clime/vault";
import {
  SessionMaterialMissingError,
  SessionNotFoundError,
} from "./errors.js";
import { sessionExpiredPayloadSchema, sessionViewSchema } from "./schemas.js";
import type {
  SessionManager,
  SessionManagerDeps,
  SessionView,
} from "./types.js";

export function createSessionManager(deps: SessionManagerDeps): SessionManager {
  const { vault, systemBus, records } = deps;

  async function requireRow(sessionId: string) {
    const row = await records.get(sessionId);
    if (!row) throw new SessionNotFoundError(sessionId);
    return row;
  }

  function toView(row: Awaited<ReturnType<typeof requireRow>>): SessionView {
    const vaultRef = vaultRefSchema.parse(row.encryptedBlobRef);
    return sessionViewSchema.parse({
      schema_version: SCHEMA_VERSION,
      id: row.id,
      accountId: row.accountId,
      status: row.status,
      expiresAt: row.expiresAt,
      lastUsedAt: row.lastUsedAt,
      vaultRef,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async function emitSessionExpired(input: {
    sessionId: string;
    accountId: string;
    reason: "expired" | "swept" | "revoked_as_expired";
    traceId: string;
    projectId?: string | null;
  }): Promise<void> {
    const payload = sessionExpiredPayloadSchema.parse({
      sessionId: input.sessionId,
      accountId: input.accountId,
      reason: input.reason,
    });
    await systemBus.publish(
      createBusEnvelope({
        type: SYSTEM_EVENT_TYPES.SessionExpired,
        traceId: input.traceId,
        projectId: input.projectId ?? null,
        payload,
      }),
    );
  }

  return {
    async create(input) {
      if (!input.material) {
        throw new SessionMaterialMissingError("new");
      }
      const { ref } = await vault.putSecret({
        kind: "session",
        plaintext: input.material,
        meta: { accountId: input.accountId },
      });
      const { id } = await records.upsert({
        accountId: input.accountId,
        status: "active",
        expiresAt: input.expiresAt ?? null,
        lastUsedAt: new Date().toISOString(),
        encryptedBlobRef: ref,
        metaJson: input.projectId
          ? JSON.stringify({
              schema_version: SCHEMA_VERSION,
              projectId: input.projectId,
            })
          : null,
      });
      return { sessionId: id, vaultRef: ref };
    },

    async get(sessionId) {
      const row = await records.get(sessionId);
      if (!row || !row.encryptedBlobRef) return null;
      return toView(row);
    },

    async getMaterial(sessionId) {
      const row = await requireRow(sessionId);
      if (!row.encryptedBlobRef) {
        throw new SessionMaterialMissingError(sessionId);
      }
      return vault.getSecret(row.encryptedBlobRef);
    },

    async touch(sessionId, _traceId) {
      const row = await requireRow(sessionId);
      await records.upsert({
        id: row.id,
        accountId: row.accountId,
        status: row.status,
        expiresAt: row.expiresAt,
        lastUsedAt: new Date().toISOString(),
        encryptedBlobRef: row.encryptedBlobRef,
        metaJson: row.metaJson,
      });
    },

    async refresh(input) {
      const row = await requireRow(input.sessionId);
      if (!row.encryptedBlobRef) {
        throw new SessionMaterialMissingError(input.sessionId);
      }
      await vault.rotateSecret(row.encryptedBlobRef, input.material);
      await records.upsert({
        id: row.id,
        accountId: row.accountId,
        status: "active",
        expiresAt: input.expiresAt ?? row.expiresAt,
        lastUsedAt: new Date().toISOString(),
        encryptedBlobRef: row.encryptedBlobRef,
        metaJson: row.metaJson,
      });
    },

    async markExpired(sessionId, traceId) {
      const row = await requireRow(sessionId);
      if (row.status === "expired") {
        return;
      }
      await records.upsert({
        id: row.id,
        accountId: row.accountId,
        status: "expired",
        expiresAt: row.expiresAt ?? new Date().toISOString(),
        lastUsedAt: row.lastUsedAt,
        encryptedBlobRef: row.encryptedBlobRef,
        metaJson: row.metaJson,
      });
      await emitSessionExpired({
        sessionId: row.id,
        accountId: row.accountId,
        reason: "expired",
        traceId,
      });
    },

    async revoke(sessionId, _traceId) {
      const row = await requireRow(sessionId);
      await records.upsert({
        id: row.id,
        accountId: row.accountId,
        status: "revoked",
        expiresAt: row.expiresAt,
        lastUsedAt: row.lastUsedAt,
        encryptedBlobRef: row.encryptedBlobRef,
        metaJson: row.metaJson,
      });
      // V1: revoke does not emit SessionExpired (intentional disconnect).
    },

    async sweepExpired(input) {
      const now = (input.now ?? new Date()).toISOString();
      const expiredIds =
        (await records.listActiveExpired?.(now)) ??
        (await fallbackListActiveExpired(records, now));

      const expiredSessionIds: string[] = [];
      for (const { id } of expiredIds) {
        const row = await records.get(id);
        if (!row || row.status !== "active") continue;
        await records.upsert({
          id: row.id,
          accountId: row.accountId,
          status: "expired",
          expiresAt: row.expiresAt,
          lastUsedAt: row.lastUsedAt,
          encryptedBlobRef: row.encryptedBlobRef,
          metaJson: row.metaJson,
        });
        await emitSessionExpired({
          sessionId: row.id,
          accountId: row.accountId,
          reason: "swept",
          traceId: input.traceId,
        });
        expiredSessionIds.push(row.id);
      }
      return { expiredSessionIds };
    },
  };
}

async function fallbackListActiveExpired(
  records: SessionManagerDeps["records"],
  _nowIso: string,
): Promise<Array<{ id: string }>> {
  void records;
  return [];
}
