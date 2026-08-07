/** B3A §5.3 / §5.4 V1 defaults */
export const DEFAULT_LEASE_TTL_MS = 30_000;
export const DEFAULT_HEARTBEAT_MS = 10_000;
/** Governor concurrency max 2–3; V1 default 3 */
export const DEFAULT_MAX_CONCURRENT_WORKERS = 3;
export const OUTBOX_PUBLISH_BATCH = 20;
