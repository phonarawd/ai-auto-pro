import { randomBytes } from "node:crypto";
import type { SessionRecordPort, SessionRecordRow } from "./types.js";
import { sessionStatusSchema } from "./schemas.js";

function newId(): string {
  return `sess_${randomBytes(12).toString("hex")}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** In-memory SessionRecordPort for tests and pre-Account wiring. */
export function createMemorySessionRecordPort(): SessionRecordPort {
  const rows = new Map<string, SessionRecordRow>();

  return {
    async upsert(input) {
      const id = input.id ?? newId();
      const existing = rows.get(id);
      const now = nowIso();
      const status = sessionStatusSchema.parse(input.status);
      const row: SessionRecordRow = {
        id,
        accountId: input.accountId,
        status,
        expiresAt: input.expiresAt,
        lastUsedAt: input.lastUsedAt,
        encryptedBlobRef: input.encryptedBlobRef,
        metaJson: input.metaJson ?? null,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      rows.set(id, row);
      return { id };
    },

    async get(id) {
      return rows.get(id) ?? null;
    },

    async listByAccount(accountId) {
      return [...rows.values()]
        .filter((r) => r.accountId === accountId)
        .map((r) => ({ id: r.id }));
    },

    async listActiveExpired(nowIsoValue) {
      return [...rows.values()]
        .filter(
          (r) =>
            r.status === "active" &&
            r.expiresAt != null &&
            r.expiresAt <= nowIsoValue,
        )
        .map((r) => ({ id: r.id }));
    },
  };
}
