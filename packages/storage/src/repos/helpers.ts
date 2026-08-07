import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  jsonDocumentEnvelopeSchema,
  parseWithSchemaVersion,
  withSchemaVersion,
} from "../zod/index.js";
import type { ClimeSqliteDatabase } from "../db/client.js";

export type RepoContext = {
  db: ClimeSqliteDatabase;
};

export function newId(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Parse + validate a JSON column string as a schema_version envelope. */
export function parseJsonColumn(
  json: string,
  label: string,
): Record<string, unknown> {
  let raw: unknown;
  try {
    raw = JSON.parse(json) as unknown;
  } catch {
    throw new Error(`Invalid JSON in ${label}`);
  }
  return parseWithSchemaVersion(jsonDocumentEnvelopeSchema, raw) as Record<
    string,
    unknown
  >;
}

/** Validate JSON column text before write; returns the original text if valid. */
export function assertJsonEnvelope(json: string, label: string): string {
  parseJsonColumn(json, label);
  return json;
}

/** Build a minimal envelope JSON string for seed / defaults. */
export function envelopeJson(
  data: Record<string, unknown> = {},
): string {
  return JSON.stringify(withSchemaVersion({ data }));
}

const stringArrayEnvelopeSchema = z.object({
  schema_version: z.literal(1),
  ids: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

/** dependency_ids_json / tags_json style columns. */
export function assertStringListEnvelope(
  json: string,
  label: string,
): string {
  let raw: unknown;
  try {
    raw = JSON.parse(json) as unknown;
  } catch {
    throw new Error(`Invalid JSON in ${label}`);
  }
  parseWithSchemaVersion(stringArrayEnvelopeSchema, raw);
  return json;
}

export function stripUndefined<T extends Record<string, unknown>>(
  patch: T,
): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}
