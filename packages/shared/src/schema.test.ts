import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  SCHEMA_VERSION,
  boundaryEnvelopeSchema,
  parseWithSchemaVersion,
  publishingHistoryKindSchema,
  publishModeSchema,
  schemaVersionSchema,
  taskStateSchema,
  withSchemaVersion,
  withSchemaVersionSchema,
} from "./schema.js";

describe("withSchemaVersion", () => {
  it("attaches schema_version without dropping payload fields", () => {
    const envelope = withSchemaVersion({ type: "SystemHealth", ok: true });
    expect(envelope.schema_version).toBe(SCHEMA_VERSION);
    expect(envelope.type).toBe("SystemHealth");
    expect(envelope.ok).toBe(true);
  });
});

describe("Zod schema_version boundary", () => {
  it("accepts literal schema_version = 1", () => {
    expect(schemaVersionSchema.parse(1)).toBe(1);
  });

  it("rejects missing schema_version on envelopes", () => {
    const schema = withSchemaVersionSchema({ type: z.string() });
    expect(() => parseWithSchemaVersion(schema, { type: "X" })).toThrow();
  });

  it("parses boundary envelope with schema_version", () => {
    const parsed = parseWithSchemaVersion(boundaryEnvelopeSchema, {
      schema_version: 1,
      type: "DecisionMade",
      traceId: "tr_1",
    });
    expect(parsed.schema_version).toBe(1);
    expect(parsed.type).toBe("DecisionMade");
  });
});

describe("normative storage enums", () => {
  it("locks publishMode and publishing history kinds", () => {
    expect(publishModeSchema.parse("api")).toBe("api");
    expect(publishModeSchema.parse("session")).toBe("session");
    expect(publishingHistoryKindSchema.parse("posted_session")).toBe(
      "posted_session",
    );
    expect(() => publishingHistoryKindSchema.parse("posted")).toThrow();
  });

  it("locks Task SM including PAUSED_CHALLENGE", () => {
    expect(taskStateSchema.parse("VALIDATING")).toBe("VALIDATING");
    expect(taskStateSchema.parse("PAUSED_CHALLENGE")).toBe("PAUSED_CHALLENGE");
  });
});
