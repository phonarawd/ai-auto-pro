export class SessionError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "SessionError";
    this.code = code;
  }
}

export class SessionNotFoundError extends SessionError {
  constructor(sessionId: string) {
    super("SESSION_NOT_FOUND", `Session not found: ${sessionId}`);
    this.name = "SessionNotFoundError";
  }
}

export class SessionMaterialMissingError extends SessionError {
  constructor(sessionId: string) {
    super(
      "SESSION_MATERIAL_MISSING",
      `Session ${sessionId} has no vault ref for material`,
    );
    this.name = "SessionMaterialMissingError";
  }
}
