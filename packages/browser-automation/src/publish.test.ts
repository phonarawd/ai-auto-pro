import { describe, expect, it } from "vitest";
import { createStubApiPublishAdapter } from "./api-publish.js";
import { createStubBrowserDriver } from "./browser-driver.js";
import { sampleGaussianJitterMs } from "./jitter.js";
import { createPublishLadder } from "./ladder.js";
import type {
  PublishAccountPort,
  PublishContentPort,
  PublishMatrixView,
} from "./ports.js";
import { createDailyQuotaLedger } from "./quota.js";
import { JITTER_MAX_MS, JITTER_MIN_MS } from "./schemas.js";
import { createSessionSandbox } from "./session-sandbox.js";

function memoryPorts(options?: {
  matrix?: PublishMatrixView;
  status?: string;
}) {
  const history: Array<{ kind: string; publishMode: string | null }> = [];
  const events: Array<{ type: string; payload: Record<string, unknown> }> = [];
  let challengeMarked = false;

  const content: PublishContentPort = {
    async getArtifact(id) {
      return {
        id,
        projectId: "proj-1",
        status: options?.status ?? "ready",
        body: "Hello CLIME",
        title: "t",
      };
    },
    async appendPostedHistory(input) {
      history.push({ kind: input.kind, publishMode: input.publishMode });
      return { ok: true, id: `hist_${history.length}` };
    },
  };

  const matrix: PublishMatrixView = options?.matrix ?? {
    canPublish: true,
    publishMode: "api",
    riskLevel: "low",
    platform: "x",
    notice: "이 플랫폼은 여기까지 가능합니다.",
  };

  const account: PublishAccountPort = {
    getMatrix: () => matrix,
    markChallenge: () => {
      challengeMarked = true;
      matrix.canPublish = false;
    },
  };

  return {
    content,
    account,
    history,
    events,
    get challengeMarked() {
      return challengeMarked;
    },
    sink: {
      emit(type: string, payload: Record<string, unknown>) {
        events.push({ type, payload });
      },
    },
  };
}

describe("C2 publish ladder", () => {
  it("API path writes posted_api", async () => {
    const ports = memoryPorts({
      matrix: {
        canPublish: true,
        publishMode: "api",
        riskLevel: "low",
        platform: "x",
      },
    });
    const ladder = createPublishLadder({
      content: ports.content,
      account: ports.account,
      apiAdapter: createStubApiPublishAdapter(),
      events: ports.sink,
    });
    const res = await ladder.publish({
      projectId: "proj-1",
      contentItemId: "c1",
      accountId: "acc-1",
      traceId: "tr-api",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.historyKind).toBe("posted_api");
      expect(res.publishMode).toBe("api");
    }
    expect(ports.history.map((h) => h.kind)).toEqual(["posted_api"]);
  });

  it("session path applies sandbox + writes posted_session", async () => {
    const ports = memoryPorts({
      matrix: {
        canPublish: true,
        publishMode: "session",
        riskLevel: "medium",
        platform: "naver",
      },
    });
    const sandbox = createSessionSandbox();
    const ladder = createPublishLadder({
      content: ports.content,
      account: ports.account,
      browserDriver: createStubBrowserDriver(),
      sandbox,
      delay: async () => undefined,
      sampleJitterMs: () => 12_000,
      events: ports.sink,
    });
    const res = await ladder.publish({
      projectId: "proj-1",
      contentItemId: "c1",
      accountId: "acc-naver",
      traceId: "tr-session",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.historyKind).toBe("posted_session");
      expect(res.jitterMsApplied).toBe(12_000);
      expect(res.sandboxId).toBe("bae_sandbox_acc-naver_naver");
    }
    expect(ports.history.map((h) => h.kind)).toEqual(["posted_session"]);
  });

  it("challenge → PAUSED_CHALLENGE with zero posted_* history", async () => {
    const ports = memoryPorts({
      matrix: {
        canPublish: true,
        publishMode: "session",
        riskLevel: "medium",
        platform: "naver",
      },
    });
    const ladder = createPublishLadder({
      content: ports.content,
      account: ports.account,
      browserDriver: createStubBrowserDriver({ alwaysChallenge: true }),
      delay: async () => undefined,
      sampleJitterMs: () => 5_000,
      events: ports.sink,
    });
    const res = await ladder.publish({
      projectId: "proj-1",
      contentItemId: "c1",
      accountId: "acc-ch",
      traceId: "tr-ch",
      skipJitter: true,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("PAUSED_CHALLENGE");
      expect(res.terminal).toBe("PAUSED_CHALLENGE");
    }
    expect(ports.history).toEqual([]);
    expect(ports.challengeMarked).toBe(true);
  });

  it("Matrix canPublish=false → BLOCKED_CAPABILITY", async () => {
    const ports = memoryPorts({
      matrix: {
        canPublish: false,
        publishMode: "api",
        riskLevel: "high",
        platform: "x",
        notice: "blocked",
      },
    });
    const ladder = createPublishLadder({
      content: ports.content,
      account: ports.account,
    });
    const res = await ladder.publish({
      projectId: "proj-1",
      contentItemId: "c1",
      accountId: "acc-1",
      traceId: "tr-block",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("BLOCKED_CAPABILITY");
    expect(ports.history).toEqual([]);
  });

  it("draft content → VALIDATE_REQUIRED", async () => {
    const ports = memoryPorts({ status: "draft" });
    const ladder = createPublishLadder({
      content: ports.content,
      account: ports.account,
    });
    const res = await ladder.publish({
      projectId: "proj-1",
      contentItemId: "c1",
      accountId: "acc-1",
      traceId: "tr-val",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("VALIDATE_REQUIRED");
  });

  it("daily quota deny is honest (not silent)", async () => {
    const ports = memoryPorts();
    const quota = createDailyQuotaLedger({ limit: 1 });
    const ladder = createPublishLadder({
      content: ports.content,
      account: ports.account,
      quota,
      events: ports.sink,
    });
    const first = await ladder.publish({
      projectId: "proj-1",
      contentItemId: "c1",
      accountId: "acc-q",
      traceId: "tr-q1",
    });
    expect(first.ok).toBe(true);
    const second = await ladder.publish({
      projectId: "proj-1",
      contentItemId: "c1",
      accountId: "acc-q",
      traceId: "tr-q2",
    });
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.code).toBe("DAILY_QUOTA_EXCEEDED");
      expect(second.message.length).toBeGreaterThan(0);
    }
    expect(ports.events.some((e) => e.type === "PublishQuotaExceeded")).toBe(
      true,
    );
  });

  it("session sandbox isolates accounts", () => {
    const sandbox = createSessionSandbox();
    const a = sandbox.acquire("acc-a", "naver");
    const b = sandbox.acquire("acc-b", "naver");
    expect(a.sandboxId).not.toBe(b.sandboxId);
    expect(a.profileDirHint).not.toBe(b.profileDirHint);
    expect(sandbox.sharesContext("acc-a", "acc-b")).toBe(false);
  });

  it("Gaussian jitter samples clamp to 5–45s", () => {
    let seed = 1;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 200; i++) {
      const ms = sampleGaussianJitterMs(random);
      expect(ms).toBeGreaterThanOrEqual(JITTER_MIN_MS);
      expect(ms).toBeLessThanOrEqual(JITTER_MAX_MS);
    }
  });
});
