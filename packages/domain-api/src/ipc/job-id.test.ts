import { describe, expect, it } from "vitest";
import { generateJobId, parseJobId, createAsyncJobAck } from "./job-id.js";

describe("Job ID utilities", () => {
  it("generates valid job ids starting with job_", () => {
    const jobId = generateJobId();
    expect(jobId.startsWith("job_")).toBe(true);
    expect(parseJobId(jobId)).toBe(true);
  });

  it("rejects invalid job ids", () => {
    expect(parseJobId("invalid_id")).toBe(false);
    expect(parseJobId("job_")).toBe(false);
  });

  it("creates AsyncJobAck with required schema_version and traceId", () => {
    const ack = createAsyncJobAck("job_123", "trace_abc", { plannerQueueItemId: "pq_1" });
    expect(ack.schema_version).toBe(1);
    expect(ack.jobId).toBe("job_123");
    expect(ack.traceId).toBe("trace_abc");
    expect(ack.plannerQueueItemId).toBe("pq_1");
  });
});
