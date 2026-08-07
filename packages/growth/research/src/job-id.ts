import { randomUUID } from "node:crypto";

export function generateJobId(): string {
  return `job_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}
