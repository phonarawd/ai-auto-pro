import { describe, expect, it, vi } from "vitest";
import {
  createBusEnvelope,
  createEventBuses,
  DOMAIN_EVENT_TYPES,
  SYSTEM_EVENT_TYPES,
} from "@clime/event-bus";
import { createNotificationApiHandlers } from "./api.js";
import {
  attachNotificationBusForwarder,
  createAccountEventBusBridge,
} from "./forwarder.js";
import { createNotificationManager } from "./manager.js";

describe("@clime/notification Inbox", () => {
  it("enqueues job progress and lists newest first", () => {
    const manager = createNotificationManager();
    manager.enqueueJobProgress({
      kind: "job.enqueued",
      jobId: "job_abc",
      title: "작업 대기열 등록",
      body: "Planner Queue",
      traceId: "tr_1",
    });
    manager.enqueueJobProgress({
      kind: "job.progress",
      jobId: "job_abc",
      title: "실행 중",
      body: "RUNNING",
      traceId: "tr_1",
    });

    const list = manager.listInbox();
    expect(list).toHaveLength(2);
    expect(list[0]?.kind).toBe("job.progress");
    expect(list[1]?.kind).toBe("job.enqueued");
  });

  it("challenge pause creates PAUSED_CHALLENGE Inbox with zero bypass CTA", () => {
    const push = vi.fn();
    const manager = createNotificationManager({ onPush: push });
    const item = manager.enqueueChallengePause({
      accountId: "acc_1",
      platform: "naver",
      traceId: "tr_challenge_1",
    });

    expect(item.terminalState).toBe("PAUSED_CHALLENGE");
    expect(item.kind).toBe("challenge.pause");
    expect(item.severity).toBe("danger");
    expect(push).toHaveBeenCalledWith(expect.objectContaining({ id: item.id }));
    expect(item.actions.every((a) => !/bypass|우회|solve\s*captcha/i.test(a.label))).toBe(true);
  });

  it("rejects forbidden bypass CTA on enqueue", () => {
    const manager = createNotificationManager();
    expect(() =>
      manager.enqueue({
        kind: "challenge.pause",
        title: "bad",
        body: "bad",
        actions: [{ id: "x", label: "Captcha bypass now", kind: "resume-publish" }],
      }),
    ).toThrow(/Forbidden bypass CTA/);
  });

  it("markRead / dismiss / toast prefs via NotificationAPI handlers", async () => {
    const manager = createNotificationManager();
    const api = createNotificationApiHandlers(manager);
    const item = manager.enqueue({
      kind: "info",
      title: "hello",
      body: "world",
    });

    const marked = await api["notification.markRead"]({ itemId: item.id });
    expect(marked.marked).toBe(true);
    expect(manager.getItem(item.id)?.read).toBe(true);

    const dismissed = await api["notification.dismiss"]({ itemId: item.id });
    expect(dismissed.dismissed).toBe(true);
    expect(manager.listInbox()).toHaveLength(0);

    const prefs = await api["notification.getToastPrefs"]();
    expect(prefs.enabled).toBe(true);
    expect(prefs.challengeAlwaysInbox).toBe(true);

    const saved = await api["notification.setToastPrefs"]({ enabled: false });
    expect(saved.saved).toBe(true);
    expect(saved.prefs.challengeAlwaysInbox).toBe(true);
  });

  it("forwards PublishChallengeDetected from System bus → Inbox (no silence)", async () => {
    const buses = createEventBuses();
    const manager = createNotificationManager();
    const forwarder = attachNotificationBusForwarder(manager, buses);

    await buses.system.publish(
      createBusEnvelope({
        type: SYSTEM_EVENT_TYPES.PublishChallengeDetected,
        traceId: "tr_sys_challenge",
        payload: { accountId: "acc_n", platform: "naver", challengeType: "captcha_or_lock" },
      }),
    );

    const items = manager.listInbox();
    expect(items).toHaveLength(1);
    expect(items[0]?.terminalState).toBe("PAUSED_CHALLENGE");
    expect(items[0]?.traceId).toBe("tr_sys_challenge");

    forwarder.stop();
  });

  it("forwards PlannerItemEnqueued → job.enqueued Inbox", async () => {
    const buses = createEventBuses();
    const manager = createNotificationManager();
    attachNotificationBusForwarder(manager, buses);

    await buses.domain.publish(
      createBusEnvelope({
        type: DOMAIN_EVENT_TYPES.PlannerItemEnqueued,
        traceId: "tr_enq",
        payload: { jobId: "job_xyz", plannerQueueItemId: "pq_1" },
      }),
    );

    expect(manager.listInbox()[0]?.kind).toBe("job.enqueued");
    expect(manager.listInbox()[0]?.jobId).toBe("job_xyz");
  });

  it("Account EventBusLike bridge publishes to System bus", async () => {
    const buses = createEventBuses();
    const manager = createNotificationManager();
    attachNotificationBusForwarder(manager, buses);
    const bridge = createAccountEventBusBridge(buses.system);

    bridge.emit("PublishChallengeDetected", {
      accountId: "acc_b",
      platform: "instagram",
      challengeType: "captcha_or_lock",
      traceId: "tr_bridge",
    });
    await bridge.flush();

    expect(manager.listInbox().some((i) => i.traceId === "tr_bridge")).toBe(true);
  });
});
