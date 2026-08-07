import { z } from "zod";
import { schemaVersionSchema } from "@clime/shared";
import { domainErrorSchema, type DomainError } from "./errors.js";

export const domainIpcRequestSchema = z.object({
  requestId: z.string().min(1),
  schema_version: schemaVersionSchema,
  traceId: z.string().min(1),
  projectId: z.string().nullable().optional(),
  args: z.record(z.string(), z.unknown()).default({}),
});

export type DomainIpcRequest<TArgs = Record<string, unknown>> = {
  requestId: string;
  schema_version: 1;
  traceId: string;
  projectId?: string | null;
  args: TArgs;
};

export const domainIpcResponseSuccessSchema = z.object({
  requestId: z.string().min(1),
  ok: z.literal(true),
  traceId: z.string().min(1),
  data: z.unknown(),
});

export const domainIpcResponseFailureSchema = z.object({
  requestId: z.string().min(1),
  ok: z.literal(false),
  traceId: z.string().min(1),
  error: domainErrorSchema,
});

export const domainIpcResponseSchema = z.discriminatedUnion("ok", [
  domainIpcResponseSuccessSchema,
  domainIpcResponseFailureSchema,
]);

export type DomainIpcResponse<TData = unknown> =
  | {
      requestId: string;
      ok: true;
      traceId: string;
      data: TData;
    }
  | {
      requestId: string;
      ok: false;
      traceId: string;
      error: DomainError;
    };
