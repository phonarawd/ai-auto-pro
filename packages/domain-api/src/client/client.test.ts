import { describe, expect, it, vi } from "vitest";
import { SCHEMA_VERSION } from "@clime/shared";
import { createDomainClient } from "./create-domain-client.js";
import { createDomainHost } from "../host/create-host.js";

describe("DomainClient", () => {
  it("invokes host methods via typed namespace client methods", async () => {
    const host = createDomainHost();
    const invoker = vi.fn(async (channel, req) => host.handleIpcRequest(channel, req));

    const client = createDomainClient(invoker);

    const res = await client.growth.getMissionToday({}, { traceId: "trace_client_1" });
    expect(res).toHaveProperty("schema_version", SCHEMA_VERSION);
    expect(res).toHaveProperty("missions");
    expect(invoker).toHaveBeenCalledWith(
      "domain:growth.getMissionToday",
      expect.objectContaining({
        traceId: "trace_client_1",
        schema_version: SCHEMA_VERSION,
      }),
    );
  });

  it("throws DomainApiError on IPC failure response", async () => {
    const invoker = vi.fn(async (_channel, req) => ({
      requestId: req.requestId,
      ok: false as const,
      traceId: req.traceId,
      error: {
        code: "KILL_SWITCH" as const,
        message: "Kill switch activated",
        retryable: false,
        traceId: req.traceId,
      },
    }));

    const client = createDomainClient(invoker);

    await expect(
      client.automation.startMission({}, { traceId: "trace_client_2" }),
    ).rejects.toThrow("Kill switch activated");
  });
});
