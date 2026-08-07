import { randomUUID } from "node:crypto";

/** Local jobId helper — mirrors Domain API async ack shape without coupling to domain-api. */
export function generateJobId(): string {
  return `job_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}
