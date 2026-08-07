/**
 * @clime/session — token/session lifecycle; Vault-backed material; SessionExpired.
 */

export type {
  SessionManager,
  SessionManagerDeps,
  SessionRecordPort,
  SessionRecordRow,
  SessionStatus,
  SessionView,
} from "./types.js";

export {
  sessionStatusSchema,
  sessionExpiredReasonSchema,
  sessionExpiredPayloadSchema,
  sessionViewSchema,
} from "./schemas.js";

export {
  SessionError,
  SessionNotFoundError,
  SessionMaterialMissingError,
} from "./errors.js";

export { createMemorySessionRecordPort } from "./memory-session-record-port.js";
export { createSessionManager } from "./create-session-manager.js";
