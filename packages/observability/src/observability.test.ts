import { describe, expect, it, vi } from "vitest";
import { SCHEMA_VERSION } from "@clime/shared";
import {
  createObservability,
  createTraceId,
  getActiveTraceId,
  MissingTraceIdError,
  requireTraceId,
  resolveTraceId,
  runWithTraceId,
  tracedAiCallSchema,
  tracedAuditEventSchema,
  tracedIpcRequestSchema,
  tracedIpcResponseSchema,
  tracedWorkflowRunSchema,
  TRACE_MANDATORY_PATHS,
} from "./index.js";

describe("@clime/observability", () => {
  it("defines mandatory trace paths for ipc, workflow, ai, bus, and governance", () => {
    expect(TRACE_MANDATORY_PATHS).toEqual([
      "ipc",
      "workflow",
      "ai",
      "bus",
      "governance",
    ]);
  });

  it("creates non-empty trace ids with tr_ prefix", () => {
    const id = createTraceId();
    expect(id.startsWith("tr_")).toBe(true);
    expect(id.length).toBeGreaterThan(4);
  });

  it("requireTraceId throws MissingTraceIdError on mandatory paths when absent", () => {
    for (const path of TRACE_MANDATORY_PATHS) {
      expect(() => requireTraceId(path, {})).toThrow(MissingTraceIdError);
      expect(() => requireTraceId(path, { traceId: "" })).toThrow(MissingTraceIdError);
    }
  });

  it("requireTraceId returns parsed traceId when present", () => {
    expect(requireTraceId("ipc", { traceId: "tr-ipc-1" })).toBe("tr-ipc-1");
    expect(requireTraceId("workflow", { traceId: "tr-wf-1" })).toBe("tr-wf-1");
    expect(requireTraceId("ai", { traceId: "tr-ai-1" })).toBe("tr-ai-1");
  });

  it("resolveTraceId falls back to active async context", async () => {
    await runWithTraceId("tr-context-1", async () => {
      expect(resolveTraceId("ipc", {}, getActiveTraceId())).toBe("tr-context-1");
      expect(resolveTraceId("ai", { traceId: "tr-explicit" }, getActiveTraceId())).toBe(
        "tr-explicit",
      );
    });
  });

  it("propagates traceId through async context", async () => {
    const seen: Array<string | undefined> = [];

    await runWithTraceId("tr-async-1", async () => {
      seen.push(getActiveTraceId());
      await Promise.resolve();
      seen.push(getActiveTraceId());
    });

    expect(seen).toEqual(["tr-async-1", "tr-async-1"]);
    expect(getActiveTraceId()).toBeUndefined();
  });

  it("records IPC handler invocations with traceId (S3A pipeline step 8)", () => {
    const obs = createObservability();

    obs.record({
      traceId: "tr-record-1",
      channel: "domain:automation.startMission",
      requestId: "req-1",
      ok: true,
      path: "ipc",
    });

    expect(obs.getRecords()).toEqual([
      {
        traceId: "tr-record-1",
        channel: "domain:automation.startMission",
        requestId: "req-1",
        ok: true,
        path: "ipc",
      },
    ]);
  });

  it("record uses active context when traceId omitted on input", async () => {
    const obs = createObservability();

    await obs.runWithTraceId("tr-from-context", async () => {
      obs.record({
        traceId: "",
        channel: "domain:growth.getMissionToday",
        ok: true,
        path: "ipc",
      });
    });

    expect(obs.getRecords()[0]?.traceId).toBe("tr-from-context");
  });

  it("forwards records to an external sink", () => {
    const sink = vi.fn();
    const obs = createObservability({ sink });

    obs.record({
      traceId: "tr-sink-1",
      channel: "domain:content.validate",
      requestId: "req-2",
      ok: false,
      path: "ipc",
      errorCode: "VALIDATION_FAILED",
    });

    expect(sink).toHaveBeenCalledWith({
      traceId: "tr-sink-1",
      channel: "domain:content.validate",
      requestId: "req-2",
      ok: false,
      path: "ipc",
      errorCode: "VALIDATION_FAILED",
    });
    expect(obs.getRecords()).toEqual([]);
  });

  it("validates traced IPC request envelopes", () => {
    const parsed = tracedIpcRequestSchema.parse({
      requestId: "req-ipc",
      schema_version: SCHEMA_VERSION,
      traceId: "tr-ipc-req",
      args: { missionId: "m-1" },
    });

    expect(parsed.traceId).toBe("tr-ipc-req");
    expect(() =>
      tracedIpcRequestSchema.parse({
        requestId: "req-ipc",
        schema_version: SCHEMA_VERSION,
        args: {},
      }),
    ).toThrow();
  });

  it("validates traced IPC success and error responses", () => {
    expect(
      tracedIpcResponseSchema.parse({
        requestId: "req-res",
        ok: true,
        traceId: "tr-ipc-ok",
        data: { schema_version: SCHEMA_VERSION, jobId: "job_1" },
      }).traceId,
    ).toBe("tr-ipc-ok");

    expect(
      tracedIpcResponseSchema.parse({
        requestId: "req-res",
        ok: false,
        traceId: "tr-ipc-err",
        error: {
          code: "POLICY_DENIED",
          message: "denied",
          retryable: false,
          traceId: "tr-ipc-err",
        },
      }).traceId,
    ).toBe("tr-ipc-err");
  });

  it("validates traced workflow run boundaries", () => {
    const run = tracedWorkflowRunSchema.parse({
      schema_version: SCHEMA_VERSION,
      workflowRunId: "wr-1",
      traceId: "tr-wf-run",
    });

    expect(run.traceId).toBe("tr-wf-run");
    expect(() =>
      tracedWorkflowRunSchema.parse({
        schema_version: SCHEMA_VERSION,
        workflowRunId: "wr-1",
      }),
    ).toThrow();
  });

  it("validates traced AI call boundaries", () => {
    const call = tracedAiCallSchema.parse({
      schema_version: SCHEMA_VERSION,
      traceId: "tr-ai-call",
      provider: "openai",
      operation: "chat.completions",
    });

    expect(call.traceId).toBe("tr-ai-call");
    expect(() =>
      tracedAiCallSchema.parse({
        schema_version: SCHEMA_VERSION,
        provider: "ollama",
        operation: "generate",
      }),
    ).toThrow();
  });

  it("validates traced governance audit events", () => {
    const audit = tracedAuditEventSchema.parse({
      schema_version: SCHEMA_VERSION,
      type: "KillSwitchActivated",
      traceId: "tr-kill",
      payload: { reason: "operator" },
    });

    expect(audit.traceId).toBe("tr-kill");
    expect(() =>
      tracedAuditEventSchema.parse({
        schema_version: SCHEMA_VERSION,
        type: "FeatureDenied",
        payload: {},
      }),
    ).toThrow();
  });
});
