export class AiError extends Error {
  readonly code: string;
  readonly traceId?: string;

  constructor(code: string, message: string, traceId?: string) {
    super(message);
    this.name = "AiError";
    this.code = code;
    this.traceId = traceId;
  }
}

export class AiValidationError extends AiError {
  constructor(message: string, traceId?: string) {
    super("AI_VALIDATION", message, traceId);
    this.name = "AiValidationError";
  }
}

export class AiAuthError extends AiError {
  constructor(message: string, traceId?: string) {
    super("AI_AUTH", message, traceId);
    this.name = "AiAuthError";
  }
}

export class AiCircuitOpenError extends AiError {
  readonly adapterId: string;

  constructor(adapterId: string, traceId?: string) {
    super(
      "CIRCUIT_OPEN",
      `Circuit open for adapter: ${adapterId}`,
      traceId,
    );
    this.name = "AiCircuitOpenError";
    this.adapterId = adapterId;
  }
}

export class AiBudgetExhaustedError extends AiError {
  constructor(message: string, traceId?: string) {
    super("AI_BUDGET_EXHAUSTED", message, traceId);
    this.name = "AiBudgetExhaustedError";
  }
}

export class AiAllProvidersFailedError extends AiError {
  readonly causes: unknown[];

  constructor(traceId: string, causes: unknown[] = []) {
    super(
      "AI_ALL_FAILED",
      `All AI providers failed (traceId=${traceId})`,
      traceId,
    );
    this.name = "AiAllProvidersFailedError";
    this.causes = causes;
  }
}
