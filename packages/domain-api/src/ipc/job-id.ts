import { z } from "zod";
import { withSchemaVersionSchema, SCHEMA_VERSION } from "@clime/shared";

export const JOB_ID_PREFIX = "job_" as const;

export const asyncJobAckSchema = withSchemaVersionSchema({
  jobId: z.string().min(1),
  traceId: z.string().min(1),
  workflowRunId: z.string().optional(),
  plannerQueueItemId: z.string().optional(),
});

export type AsyncJobAck = z.infer<typeof asyncJobAckSchema>;

/**
 * Generates a standard jobId: job_<timestamp_random>
 */
export function generateJobId(): string {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return `${JOB_ID_PREFIX}${now}_${rand}`;
}

/**
 * Validates jobId format.
 */
export function parseJobId(jobId: string): boolean {
  return typeof jobId === "string" && jobId.startsWith(JOB_ID_PREFIX) && jobId.length > JOB_ID_PREFIX.length;
}

export function createAsyncJobAck(
  jobId: string,
  traceId: string,
  options?: {
    workflowRunId?: string;
    plannerQueueItemId?: string;
  },
): AsyncJobAck {
  return {
    schema_version: SCHEMA_VERSION,
    jobId,
    traceId,
    workflowRunId: options?.workflowRunId,
    plannerQueueItemId: options?.plannerQueueItemId,
  };
}
