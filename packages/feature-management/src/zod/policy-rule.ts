import { z } from "zod";
import { schemaVersionSchema } from "@clime/shared";

export const baselinePolicyFieldsSchema = z.object({
  kind: z.literal("baseline"),
  pauseOnChallenge: z.boolean(),
  maxRetries: z.number().int().nonnegative(),
  humanApprovalRequired: z.boolean(),
});

export const publishGatePolicyFieldsSchema = z.object({
  kind: z.literal("publish_gate"),
  requireValidate: z.boolean(),
  requireCapability: z.boolean(),
});

export const governorLimitsPolicyFieldsSchema = z.object({
  kind: z.literal("governor_limits"),
  maxConcurrentRuns: z.number().int().positive().optional(),
  maxCostUnits: z.number().nonnegative().optional(),
});

export const knownPolicyFieldsSchema = z.discriminatedUnion("kind", [
  baselinePolicyFieldsSchema,
  publishGatePolicyFieldsSchema,
  governorLimitsPolicyFieldsSchema,
]);

/** Storage seed shape: `{ schema_version, data: { kind, ... } }`. */
const nestedSeedEnvelopeSchema = z.object({
  schema_version: schemaVersionSchema,
  data: z.record(z.string(), z.unknown()),
});

export type BaselinePolicy = z.infer<typeof baselinePolicyFieldsSchema>;
export type PublishGatePolicy = z.infer<typeof publishGatePolicyFieldsSchema>;
export type GovernorLimitsPolicy = z.infer<
  typeof governorLimitsPolicyFieldsSchema
>;

export type KnownPolicy =
  | BaselinePolicy
  | PublishGatePolicy
  | GovernorLimitsPolicy;

/**
 * Parse policy rule_json. Accepts flat `{schema_version,kind,...}` or
 * Storage seed nested `{schema_version,data:{kind,...}}`.
 */
export function parsePolicyRuleJson(
  ruleJson: string,
): { ok: true; known: KnownPolicy | null } | { ok: false; message: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(ruleJson) as unknown;
  } catch {
    return { ok: false, message: "Policy rule_json is not valid JSON" };
  }

  if (typeof raw !== "object" || raw === null) {
    return { ok: false, message: "Policy rule_json must be an object" };
  }

  const obj = raw as Record<string, unknown>;
  if (obj.schema_version !== 1) {
    return {
      ok: false,
      message: "Policy rule_json missing schema_version or unsupported version",
    };
  }

  let fields: unknown = obj;
  const nested = nestedSeedEnvelopeSchema.safeParse(obj);
  if (nested.success && typeof nested.data.data.kind === "string") {
    fields = nested.data.data;
  }

  if (
    typeof fields !== "object" ||
    fields === null ||
    !("kind" in fields) ||
    typeof (fields as { kind: unknown }).kind !== "string"
  ) {
    return {
      ok: false,
      message: "Policy rule_json missing kind",
    };
  }

  const known = knownPolicyFieldsSchema.safeParse(fields);
  if (known.success) {
    return { ok: true, known: known.data };
  }

  // Unknown kind — forward-compatible ignore after schema_version + kind present
  return { ok: true, known: null };
}

/** Serialize a known policy as flat envelope for setPolicy writes. */
export function serializePolicyRule(policy: KnownPolicy): string {
  return JSON.stringify({ schema_version: 1 as const, ...policy });
}
