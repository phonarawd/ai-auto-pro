import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "@clime/shared";
import { domainIpcRequestSchema, domainIpcResponseSchema } from "./envelope.js";

describe("IPC Envelope Schemas", () => {
  it("validates correct domainIpcRequest envelope", () => {
    const valid = {
      requestId: "req_123",
      schema_version: SCHEMA_VERSION,
      traceId: "trace_abc",
      projectId: "proj_1",
      args: { foo: "bar" },
    };
    const result = domainIpcRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects invalid schema_version in domainIpcRequest", () => {
    const invalid = {
      requestId: "req_123",
      schema_version: 999,
      traceId: "trace_abc",
      args: {},
    };
    const result = domainIpcRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("validates successful response envelope", () => {
    const response = {
      requestId: "req_123",
      ok: true as const,
      traceId: "trace_abc",
      data: { missions: [] },
    };
    const result = domainIpcResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("validates failure response envelope", () => {
    const response = {
      requestId: "req_123",
      ok: false as const,
      traceId: "trace_abc",
      error: {
        code: "FEATURE_DISABLED" as const,
        message: "Feature is disabled",
        retryable: false,
        traceId: "trace_abc",
      },
    };
    const result = domainIpcResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});
