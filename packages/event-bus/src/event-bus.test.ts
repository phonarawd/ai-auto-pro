import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "@clime/shared";
import {
  COMMAND_TYPES,
  createBusEnvelope,
  createEventBuses,
  DOMAIN_EVENT_TYPES,
  parseBusEnvelope,
  QUERY_TYPES,
  SYSTEM_EVENT_TYPES,
} from "./index.js";

describe("@clime/event-bus", () => {
  it("creates four separate bus instances", () => {
    const buses = createEventBuses();
    expect(buses.command).not.toBe(buses.query);
    expect(buses.domain).not.toBe(buses.system);
    expect(buses.command).not.toBe(buses.domain);
  });

  it("builds and validates bus envelopes with schema_version and traceId", () => {
    const envelope = createBusEnvelope({
      type: DOMAIN_EVENT_TYPES.DecisionMade,
      traceId: "tr-envelope-1",
      projectId: "proj-1",
      payload: { decisionId: "dec-1" },
    });

    expect(envelope.schema_version).toBe(SCHEMA_VERSION);
    expect(envelope.traceId).toBe("tr-envelope-1");
    expect(envelope.type).toBe("DecisionMade");
    expect(envelope.payload).toEqual({ decisionId: "dec-1" });
    expect(() => parseBusEnvelope(envelope)).not.toThrow();
  });

  it("rejects envelopes with missing traceId", () => {
    expect(() =>
      parseBusEnvelope({
        schema_version: SCHEMA_VERSION,
        type: "BadEvent",
        occurredAt: new Date().toISOString(),
        payload: {},
      }),
    ).toThrow();
  });

  it("dispatches commands to a single registered handler", async () => {
    const { command } = createEventBuses();
    const seen: string[] = [];

    command.register(COMMAND_TYPES.GenerateContent, async (cmd) => {
      seen.push(cmd.traceId);
    });

    await command.dispatch(
      createBusEnvelope({
        type: COMMAND_TYPES.GenerateContent,
        traceId: "tr-cmd-1",
      }),
    );

    expect(seen).toEqual(["tr-cmd-1"]);
  });

  it("throws when dispatching an unregistered command", async () => {
    const { command } = createEventBuses();
    await expect(
      command.dispatch(
        createBusEnvelope({
          type: "UnknownCommand",
          traceId: "tr-cmd-missing",
        }),
      ),
    ).rejects.toThrow(/no handler registered/);
  });

  it("answers queries through a registered handler", async () => {
    const { query } = createEventBuses();

    query.register(QUERY_TYPES.GetMissionToday, async (q) => ({
      traceId: q.traceId,
      missions: [{ id: "m-1" }],
    }));

    const result = await query.ask<{ traceId: string; missions: { id: string }[] }>(
      createBusEnvelope({
        type: QUERY_TYPES.GetMissionToday,
        traceId: "tr-q-1",
        projectId: "proj-1",
      }),
    );

    expect(result.traceId).toBe("tr-q-1");
    expect(result.missions).toEqual([{ id: "m-1" }]);
  });

  it("publishes domain events to multiple subscribers", async () => {
    const { domain } = createEventBuses();
    const hits: string[] = [];

    domain.subscribe(DOMAIN_EVENT_TYPES.PlannerItemEnqueued, async () => {
      hits.push("typed");
    });
    domain.subscribe("*", async () => {
      hits.push("wildcard");
    });

    await domain.publish(
      createBusEnvelope({
        type: DOMAIN_EVENT_TYPES.PlannerItemEnqueued,
        traceId: "tr-dom-1",
      }),
    );

    expect(hits).toEqual(["typed", "wildcard"]);
  });

  it("isolates system events from domain bus", async () => {
    const { domain, system } = createEventBuses();
    const domainHits: string[] = [];
    const systemHits: string[] = [];

    domain.subscribe("*", async () => {
      domainHits.push("domain");
    });
    system.subscribe(SYSTEM_EVENT_TYPES.SessionExpired, async () => {
      systemHits.push("system");
    });

    await system.publish(
      createBusEnvelope({
        type: SYSTEM_EVENT_TYPES.SessionExpired,
        traceId: "tr-sys-1",
      }),
    );

    expect(systemHits).toEqual(["system"]);
    expect(domainHits).toEqual([]);
  });

  it("unsubscribes handlers", async () => {
    const { system } = createEventBuses();
    const hits: string[] = [];

    const off = system.subscribe(SYSTEM_EVENT_TYPES.GovernorThrottled, async () => {
      hits.push("hit");
    });
    off();

    await system.publish(
      createBusEnvelope({
        type: SYSTEM_EVENT_TYPES.GovernorThrottled,
        traceId: "tr-unsub",
      }),
    );

    expect(hits).toEqual([]);
  });
});
