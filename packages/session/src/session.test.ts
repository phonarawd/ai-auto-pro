import {
  SYSTEM_EVENT_TYPES,
  createSystemEventBus,
  type BusEnvelope,
} from "@clime/event-bus";
import { createMemoryVault } from "@clime/vault";
import { describe, expect, it } from "vitest";
import {
  createMemorySessionRecordPort,
  createSessionManager,
  SessionNotFoundError,
} from "./index.js";

describe("@clime/session", () => {
  it("stores material in vault — view has ref only", async () => {
    const vault = createMemoryVault();
    const records = createMemorySessionRecordPort();
    const systemBus = createSystemEventBus();
    const sessions = createSessionManager({ vault, records, systemBus });

    const material = "session-cookie-plaintext-do-not-persist";
    const { sessionId, vaultRef } = await sessions.create({
      accountId: "acc_1",
      material,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      traceId: "tr_create",
    });

    const view = await sessions.get(sessionId);
    expect(view?.vaultRef).toBe(vaultRef);
    expect(JSON.stringify(view)).not.toContain(material);
    expect(await sessions.getMaterial(sessionId)).toBe(material);
  });

  it("emits SessionExpired on markExpired", async () => {
    const vault = createMemoryVault();
    const records = createMemorySessionRecordPort();
    const systemBus = createSystemEventBus();
    const events: BusEnvelope[] = [];
    systemBus.subscribe(SYSTEM_EVENT_TYPES.SessionExpired, (e) => {
      events.push(e);
    });

    const sessions = createSessionManager({ vault, records, systemBus });
    const { sessionId } = await sessions.create({
      accountId: "acc_2",
      material: "mat-2",
      traceId: "tr_1",
    });

    await sessions.markExpired(sessionId, "tr_expire");
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("SessionExpired");
    expect(events[0]?.traceId).toBe("tr_expire");
    expect(events[0]?.schema_version).toBe(1);
    expect(events[0]?.payload).toMatchObject({
      sessionId,
      accountId: "acc_2",
      reason: "expired",
    });

    // idempotent — no second emit
    await sessions.markExpired(sessionId, "tr_expire_2");
    expect(events).toHaveLength(1);

    const view = await sessions.get(sessionId);
    expect(view?.status).toBe("expired");
  });

  it("sweepExpired emits SessionExpired with reason swept", async () => {
    const vault = createMemoryVault();
    const records = createMemorySessionRecordPort();
    const systemBus = createSystemEventBus();
    const events: BusEnvelope[] = [];
    systemBus.subscribe("*", (e) => {
      events.push(e);
    });

    const sessions = createSessionManager({ vault, records, systemBus });
    const past = new Date(Date.now() - 5_000).toISOString();
    const { sessionId } = await sessions.create({
      accountId: "acc_3",
      material: "mat-3",
      expiresAt: past,
      traceId: "tr_sw",
    });

    const { expiredSessionIds } = await sessions.sweepExpired({
      now: new Date(),
      traceId: "tr_sweep",
    });
    expect(expiredSessionIds).toEqual([sessionId]);
    expect(events.filter((e) => e.type === "SessionExpired")).toHaveLength(1);
    expect(events[0]?.payload).toMatchObject({ reason: "swept" });
  });

  it("revoke does not emit SessionExpired", async () => {
    const vault = createMemoryVault();
    const records = createMemorySessionRecordPort();
    const systemBus = createSystemEventBus();
    const events: BusEnvelope[] = [];
    systemBus.subscribe("*", (e) => events.push(e));

    const sessions = createSessionManager({ vault, records, systemBus });
    const { sessionId } = await sessions.create({
      accountId: "acc_4",
      material: "mat-4",
      traceId: "tr_r",
    });
    await sessions.revoke(sessionId, "tr_revoke");
    expect(events).toHaveLength(0);
    expect((await sessions.get(sessionId))?.status).toBe("revoked");
  });

  it("refresh rotates vault material", async () => {
    const vault = createMemoryVault();
    const sessions = createSessionManager({
      vault,
      records: createMemorySessionRecordPort(),
      systemBus: createSystemEventBus(),
    });
    const { sessionId } = await sessions.create({
      accountId: "acc_5",
      material: "old-mat",
      traceId: "tr_rf",
    });
    await sessions.refresh({
      sessionId,
      material: "new-mat",
      traceId: "tr_rf2",
    });
    expect(await sessions.getMaterial(sessionId)).toBe("new-mat");
  });

  it("throws SessionNotFoundError for unknown id", async () => {
    const sessions = createSessionManager({
      vault: createMemoryVault(),
      records: createMemorySessionRecordPort(),
      systemBus: createSystemEventBus(),
    });
    await expect(sessions.touch("missing", "t")).rejects.toBeInstanceOf(
      SessionNotFoundError,
    );
  });
});
