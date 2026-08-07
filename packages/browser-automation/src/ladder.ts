import { SCHEMA_VERSION } from "@clime/shared";
import type { ApiPublishAdapter } from "./api-publish.js";
import { createStubApiPublishAdapter } from "./api-publish.js";
import type { BrowserDriver } from "./browser-driver.js";
import { createStubBrowserDriver } from "./browser-driver.js";
import { sampleGaussianJitterMs, wallClockDelay, type DelayFn } from "./jitter.js";
import {
  POST_VALIDATE_STATUSES,
  PUBLISH_EVENT_TYPES,
  type PublishAccountPort,
  type PublishContentPort,
  type PublishEventSink,
} from "./ports.js";
import { createDailyQuotaLedger, type DailyQuotaLedger } from "./quota.js";
import { PUBLISH_ERROR_CODES, type PublishResult } from "./schemas.js";
import { createSessionSandbox, type SessionSandbox } from "./session-sandbox.js";

export type PublishLadderInput = {
  projectId: string;
  contentItemId: string;
  accountId: string;
  platform?: string;
  traceId: string;
  /** Test-only — production session path must apply jitter. */
  skipJitter?: boolean;
};

export type PublishLadder = {
  publish(input: PublishLadderInput): Promise<PublishResult>;
};

export type CreatePublishLadderOptions = {
  content: PublishContentPort;
  account: PublishAccountPort;
  apiAdapter?: ApiPublishAdapter;
  browserDriver?: BrowserDriver;
  sandbox?: SessionSandbox;
  quota?: DailyQuotaLedger;
  sampleJitterMs?: () => number;
  delay?: DelayFn;
  events?: PublishEventSink;
};

function fail(
  code: (typeof PUBLISH_ERROR_CODES)[keyof typeof PUBLISH_ERROR_CODES],
  message: string,
  traceId: string,
): PublishResult {
  const terminals: Partial<
    Record<string, "BLOCKED_CAPABILITY" | "PAUSED_CHALLENGE" | "FAILED">
  > = {
    BLOCKED_CAPABILITY: "BLOCKED_CAPABILITY",
    PAUSED_CHALLENGE: "PAUSED_CHALLENGE",
    PUBLISH_FAILED: "FAILED",
  };
  return {
    schema_version: SCHEMA_VERSION,
    ok: false,
    code,
    terminal: terminals[code],
    message,
    traceId,
  };
}

export function createPublishLadder(
  options: CreatePublishLadderOptions,
): PublishLadder {
  const api = options.apiAdapter ?? createStubApiPublishAdapter();
  const driver = options.browserDriver ?? createStubBrowserDriver();
  const sandbox = options.sandbox ?? createSessionSandbox();
  const quota = options.quota ?? createDailyQuotaLedger();
  const sampleJitter = options.sampleJitterMs ?? sampleGaussianJitterMs;
  const delay = options.delay ?? wallClockDelay;
  const events = options.events;

  return {
    async publish(input) {
      const { traceId } = input;
      const artifact = await options.content.getArtifact(input.contentItemId);
      if (!artifact || artifact.projectId !== input.projectId) {
        return fail(
          PUBLISH_ERROR_CODES.NOT_FOUND,
          `Content item not found: ${input.contentItemId}`,
          traceId,
        );
      }

      if (!POST_VALIDATE_STATUSES.has(artifact.status)) {
        return fail(
          PUBLISH_ERROR_CODES.VALIDATE_REQUIRED,
          `Validate required before publish (status=${artifact.status})`,
          traceId,
        );
      }

      const matrix = options.account.getMatrix(input.accountId, input.platform);
      if (!matrix.canPublish) {
        return fail(
          PUBLISH_ERROR_CODES.BLOCKED_CAPABILITY,
          matrix.notice ??
            "Capability Matrix 제약: 이 플랫폼은 여기까지 가능합니다. (canPublish=false)",
          traceId,
        );
      }

      if (quota.remaining(input.accountId) <= 0) {
        events?.emit(
          PUBLISH_EVENT_TYPES.PublishQuotaExceeded,
          {
            accountId: input.accountId,
            platform: matrix.platform,
            reason: "Daily publish quota exceeded",
          },
          traceId,
        );
        return fail(
          PUBLISH_ERROR_CODES.DAILY_QUOTA_EXCEEDED,
          "일일 게시 한도를 초과했습니다. 내일 다시 시도하거나 한도를 확인하세요.",
          traceId,
        );
      }

      if (matrix.publishMode === "api") {
        const posted = await api.publish({
          accountId: input.accountId,
          platform: matrix.platform,
          body: artifact.body,
          title: artifact.title,
          traceId,
        });
        if (!posted.ok) {
          return fail(
            PUBLISH_ERROR_CODES.PUBLISH_FAILED,
            posted.reason,
            traceId,
          );
        }
        const hist = await options.content.appendPostedHistory({
          projectId: input.projectId,
          contentItemId: artifact.id,
          accountId: input.accountId,
          kind: "posted_api",
          publishMode: "api",
          externalPostId: posted.externalPostId,
          meta: { ladder: "P0" },
        });
        if (!hist.ok) {
          return fail(
            PUBLISH_ERROR_CODES.PUBLISH_FAILED,
            hist.message,
            traceId,
          );
        }
        quota.recordSuccess(input.accountId);
        events?.emit(
          PUBLISH_EVENT_TYPES.ContentPublishedApi,
          {
            contentItemId: artifact.id,
            accountId: input.accountId,
            platform: matrix.platform,
            externalPostId: posted.externalPostId,
          },
          traceId,
        );
        return {
          schema_version: SCHEMA_VERSION,
          ok: true,
          publishMode: "api",
          historyKind: "posted_api",
          externalPostId: posted.externalPostId,
          traceId,
        };
      }

      // P1 session path — jitter + sandbox + BAE
      let jitterMsApplied = 0;
      if (!input.skipJitter) {
        jitterMsApplied = sampleJitter();
        await delay(jitterMsApplied);
      }

      const handle = sandbox.acquire(input.accountId, matrix.platform);
      const session = await driver.sessionPublish({
        accountId: input.accountId,
        platform: matrix.platform,
        body: artifact.body,
        title: artifact.title,
        sandbox: handle,
        traceId,
      });

      if (!session.ok && session.challenge) {
        // markChallenge → Account health → PublishChallengeDetected / PublishAutoPaused (Inbox).
        // Do not double-emit those System events here.
        options.account.markChallenge({
          accountId: input.accountId,
          platform: matrix.platform,
          reason: session.reason,
          traceId,
        });
        return fail(
          PUBLISH_ERROR_CODES.PAUSED_CHALLENGE,
          session.reason,
          traceId,
        );
      }

      if (!session.ok) {
        return fail(
          PUBLISH_ERROR_CODES.PUBLISH_FAILED,
          session.reason,
          traceId,
        );
      }

      const hist = await options.content.appendPostedHistory({
        projectId: input.projectId,
        contentItemId: artifact.id,
        accountId: input.accountId,
        kind: "posted_session",
        publishMode: "session",
        externalPostId: session.externalPostId,
        meta: { ladder: "P1", sandboxId: handle.sandboxId },
      });
      if (!hist.ok) {
        return fail(PUBLISH_ERROR_CODES.PUBLISH_FAILED, hist.message, traceId);
      }

      quota.recordSuccess(input.accountId);
      events?.emit(
        PUBLISH_EVENT_TYPES.ContentPublishedSession,
        {
          contentItemId: artifact.id,
          accountId: input.accountId,
          platform: matrix.platform,
          externalPostId: session.externalPostId,
          sandboxId: handle.sandboxId,
        },
        traceId,
      );

      return {
        schema_version: SCHEMA_VERSION,
        ok: true,
        publishMode: "session",
        historyKind: "posted_session",
        externalPostId: session.externalPostId,
        traceId,
        jitterMsApplied,
        sandboxId: handle.sandboxId,
      };
    },
  };
}
