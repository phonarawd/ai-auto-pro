import type { PublishMode } from "./schemas.js";

/** Minimal Matrix view required by PublishLadder (from Account CapabilityMatrix). */
export type PublishMatrixView = {
  canPublish: boolean;
  publishMode: PublishMode;
  riskLevel: "low" | "medium" | "high";
  platform: string;
  notice?: string;
};

export type ContentPublishStatus =
  | "draft"
  | "validated"
  | "optimized"
  | "ready"
  | "failed_validation"
  | string;

export type ContentArtifactView = {
  id: string;
  projectId: string;
  status: ContentPublishStatus;
  body: string;
  title?: string;
};

export type PublishContentPort = {
  getArtifact(contentItemId: string): Promise<ContentArtifactView | null>;
  appendPostedHistory(input: {
    projectId: string;
    contentItemId: string;
    accountId: string;
    kind: "posted_api" | "posted_session";
    publishMode: PublishMode;
    externalPostId: string;
    meta?: Record<string, unknown>;
  }): Promise<{ ok: true; id: string } | { ok: false; code: string; message: string }>;
};

export type PublishAccountPort = {
  getMatrix(accountId: string, platform?: string): PublishMatrixView;
  markChallenge(input: {
    accountId: string;
    platform: string;
    reason: string;
    traceId: string;
  }): void;
};

export type PublishEventSink = {
  emit(type: string, payload: Record<string, unknown>, traceId: string): void;
};

export const PUBLISH_EVENT_TYPES = {
  ContentPublishedApi: "ContentPublishedApi",
  ContentPublishedSession: "ContentPublishedSession",
  PublishChallengeDetected: "PublishChallengeDetected",
  PublishAutoPaused: "PublishAutoPaused",
  PublishQuotaExceeded: "PublishQuotaExceeded",
} as const;

export const POST_VALIDATE_STATUSES = new Set([
  "validated",
  "optimized",
  "ready",
]);
