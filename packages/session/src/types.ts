import type { SystemEventBus } from "@clime/event-bus";
import type { Vault, VaultRef } from "@clime/vault";
import type { SessionStatus } from "./schemas.js";

export type { SessionStatus };

export type SessionView = {
  schema_version: 1;
  id: string;
  accountId: string;
  status: SessionStatus;
  expiresAt: string | null;
  lastUsedAt: string | null;
  vaultRef: VaultRef;
  createdAt: string;
  updatedAt: string;
};

export type SessionRecordRow = {
  id: string;
  accountId: string;
  status: SessionStatus;
  expiresAt: string | null;
  lastUsedAt: string | null;
  encryptedBlobRef: string | null;
  metaJson?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SessionRecordPort = {
  upsert(row: {
    id?: string;
    accountId: string;
    status: SessionStatus;
    expiresAt: string | null;
    lastUsedAt: string | null;
    encryptedBlobRef: string | null;
    metaJson?: string | null;
  }): Promise<{ id: string }>;
  get(id: string): Promise<SessionRecordRow | null>;
  listByAccount?(accountId: string): Promise<Array<{ id: string }>>;
  listActiveExpired?(nowIso: string): Promise<Array<{ id: string }>>;
};

export type SessionManager = {
  create(input: {
    accountId: string;
    material: string;
    expiresAt?: string | null;
    projectId?: string | null;
    traceId: string;
  }): Promise<{ sessionId: string; vaultRef: VaultRef }>;

  get(sessionId: string): Promise<SessionView | null>;

  getMaterial(sessionId: string): Promise<string>;

  touch(sessionId: string, traceId: string): Promise<void>;

  refresh(input: {
    sessionId: string;
    material: string;
    expiresAt?: string | null;
    traceId: string;
  }): Promise<void>;

  markExpired(sessionId: string, traceId: string): Promise<void>;

  revoke(sessionId: string, traceId: string): Promise<void>;

  sweepExpired(input: {
    now?: Date;
    traceId: string;
  }): Promise<{ expiredSessionIds: string[] }>;
};

export type SessionManagerDeps = {
  vault: Vault;
  systemBus: SystemEventBus;
  records: SessionRecordPort;
};
