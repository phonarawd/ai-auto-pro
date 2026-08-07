import { schemaVersionSchema, withSchemaVersion } from "@clime/shared";
import { z } from "zod";

/** Frozen bus message envelope (12_INFRASTRUCTURE §6). */
export const busEnvelopeSchema = z.object({
  schema_version: schemaVersionSchema,
  type: z.string().min(1),
  traceId: z.string().min(1),
  occurredAt: z.string().datetime(),
  projectId: z.string().nullable().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export type BusEnvelope = z.infer<typeof busEnvelopeSchema>;

export type CreateBusEnvelopeInput = {
  type: string;
  traceId: string;
  projectId?: string | null;
  payload?: Record<string, unknown>;
  occurredAt?: string;
};

/** Build a validated bus envelope with constitutional schema_version. */
export function createBusEnvelope(input: CreateBusEnvelopeInput): BusEnvelope {
  const envelope = withSchemaVersion({
    type: input.type,
    traceId: input.traceId,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
    payload: input.payload ?? {},
  });

  return busEnvelopeSchema.parse(envelope);
}

/** Parse unknown input at a bus boundary; rejects bad schema_version or shape. */
export function parseBusEnvelope(input: unknown): BusEnvelope {
  return busEnvelopeSchema.parse(input);
}
