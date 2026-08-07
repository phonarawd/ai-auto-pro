import { z } from "zod";
import { schemaVersionSchema, SCHEMA_VERSION } from "@clime/shared";

export const domainErrorCodeSchema = z.enum([
  "FEATURE_DISABLED",
  "POLICY_DENIED",
  "CAPABILITY_DENIED",
  "GOVERNOR_THROTTLED",
  "KILL_SWITCH",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "CONFLICT",
  "PROVIDER_FAILED",
  "SESSION_EXPIRED",
  "UNKNOWN",
]);

export type DomainErrorCode = z.infer<typeof domainErrorCodeSchema>;

export const domainErrorDetailsSchema = z.object({
  schema_version: schemaVersionSchema,
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
  jobId: z.string().optional(),
});

export type DomainErrorDetails = z.infer<typeof domainErrorDetailsSchema>;

export const domainErrorSchema = z.object({
  code: domainErrorCodeSchema,
  message: z.string(),
  retryable: z.boolean(),
  traceId: z.string(),
  details: domainErrorDetailsSchema.optional(),
});

export type DomainError = z.infer<typeof domainErrorSchema>;

export class DomainApiError extends Error {
  readonly code: DomainErrorCode;
  readonly retryable: boolean;
  readonly traceId: string;
  readonly details?: DomainErrorDetails;

  constructor(error: DomainError) {
    super(error.message);
    this.name = "DomainApiError";
    this.code = error.code;
    this.retryable = error.retryable;
    this.traceId = error.traceId;
    this.details = error.details;
  }

  toDomainError(): DomainError {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      traceId: this.traceId,
      details: this.details,
    };
  }
}

export function createDomainError(
  code: DomainErrorCode,
  message: string,
  traceId: string,
  options?: {
    retryable?: boolean;
    details?: {
      fieldErrors?: Record<string, string[]>;
      jobId?: string;
    };
  },
): DomainError {
  return {
    code,
    message,
    retryable: options?.retryable ?? false,
    traceId,
    details: options?.details
      ? {
          schema_version: SCHEMA_VERSION,
          fieldErrors: options.details.fieldErrors,
          jobId: options.details.jobId,
        }
      : undefined,
  };
}

export function toDomainError(err: unknown, traceId: string): DomainError {
  if (err instanceof DomainApiError) {
    return err.toDomainError();
  }
  if (err && typeof err === "object" && "code" in err && "message" in err) {
    const candidate = err as Partial<DomainError>;
    const parsed = domainErrorCodeSchema.safeParse(candidate.code);
    if (parsed.success) {
      return createDomainError(
        parsed.data,
        String(candidate.message ?? "An error occurred"),
        traceId,
        {
          retryable: candidate.retryable,
        },
      );
    }
  }
  if (err instanceof Error) {
    return createDomainError("UNKNOWN", err.message, traceId);
  }
  return createDomainError("UNKNOWN", "An unknown error occurred", traceId);
}
