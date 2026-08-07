import type {
  PublishAccountPort,
  PublishContentPort,
  PublishEventSink,
  PublishMatrixView,
} from "./ports.js";

/** Minimal ContentEngine surface used by PublishLadder host wiring. */
export type ContentEnginePublishSurface = {
  getArtifact(contentItemId: string): Promise<unknown | null>;
  appendHistorySafe(input: {
    projectId: string;
    contentItemId?: string | null;
    accountId?: string | null;
    kind: unknown;
    publishMode?: "api" | "session" | null;
    externalPostId?: string | null;
    meta?: Record<string, unknown>;
  }): Promise<{ ok: true; id: string } | { ok: false; code: string; message: string }>;
};

export type AccountManagerPublishSurface = {
  getCapabilityMatrix(
    accountId?: string,
    platform?: string,
  ): {
    canPublish: boolean;
    publishMode: "api" | "session";
    riskLevel: "low" | "medium" | "high";
    platform: string;
    notice: string;
  };
  setHealthState(state: {
    accountId: string;
    platform: string;
    status: "healthy" | "degraded" | "expired" | "challenge";
    reason?: string;
    checkedAt: string;
    traceId?: string;
  }): unknown;
};

function readArtifact(raw: unknown): {
  id: string;
  projectId: string;
  status: string;
  body: string;
  title?: string;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.projectId !== "string") return null;
  const meta =
    row.meta && typeof row.meta === "object"
      ? (row.meta as Record<string, unknown>)
      : null;
  return {
    id: row.id,
    projectId: row.projectId,
    status: typeof row.status === "string" ? row.status : "draft",
    body: typeof meta?.body === "string" ? meta.body : "",
    title: typeof meta?.title === "string" ? meta.title : undefined,
  };
}

/**
 * Adapt `@clime/content` ContentEngine → PublishContentPort without a package cycle.
 */
export function adaptContentEngineToPublishPort(
  engine: ContentEnginePublishSurface,
): PublishContentPort {
  return {
    async getArtifact(contentItemId) {
      const row = await engine.getArtifact(contentItemId);
      return readArtifact(row);
    },
    appendPostedHistory(input) {
      return engine.appendHistorySafe({
        projectId: input.projectId,
        contentItemId: input.contentItemId,
        accountId: input.accountId,
        kind: input.kind,
        publishMode: input.publishMode,
        externalPostId: input.externalPostId,
        meta: input.meta,
      });
    },
  };
}

/**
 * Adapt `@clime/account` AccountManager → PublishAccountPort.
 * Does not import @clime/account (composition at host).
 */
export function adaptAccountManagerToPublishPort(
  manager: AccountManagerPublishSurface,
): PublishAccountPort {
  return {
    getMatrix(accountId, platform): PublishMatrixView {
      const m = manager.getCapabilityMatrix(accountId, platform);
      return {
        canPublish: m.canPublish,
        publishMode: m.publishMode,
        riskLevel: m.riskLevel,
        platform: m.platform,
        notice: m.notice,
      };
    },
    markChallenge(input) {
      manager.setHealthState({
        accountId: input.accountId,
        platform: input.platform,
        status: "challenge",
        reason: input.reason,
        checkedAt: new Date().toISOString(),
        traceId: input.traceId,
      });
    },
  };
}

/** Bridge PublishEventSink → Account-style EventBusLike / notification buses. */
export function createPublishEventSink(emit: {
  system?: (type: string, payload: Record<string, unknown>, traceId: string) => void;
  domain?: (type: string, payload: Record<string, unknown>, traceId: string) => void;
}): PublishEventSink {
  return {
    emit(type, payload, traceId) {
      if (
        type === "PublishChallengeDetected" ||
        type === "PublishAutoPaused" ||
        type === "PublishQuotaExceeded"
      ) {
        emit.system?.(type, payload, traceId);
        return;
      }
      emit.domain?.(type, payload, traceId);
    },
  };
}
