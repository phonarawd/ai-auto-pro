import { z } from "zod";
import { SCHEMA_VERSION, schemaVersionSchema } from "@clime/shared";

/** Workflow DSL envelope — B3A §4.1 */
export const workflowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
});

export const workflowDslSchema = z.object({
  schema_version: schemaVersionSchema,
  id: z.string().min(1),
  name: z.string().min(1),
  nodes: z.array(workflowNodeSchema).min(1),
  edges: z.array(z.tuple([z.string().min(1), z.string().min(1)])),
});

export type WorkflowDsl = z.infer<typeof workflowDslSchema>;
export type WorkflowNode = z.infer<typeof workflowNodeSchema>;

export const DAILY_GROWTH_TEMPLATE_ID = "daily-growth" as const;

export const VALIDATE_NODE_TYPE = "content.validate" as const;
export const PUBLISH_NODE_TYPE = "account.publish" as const;
export const EXPORT_NODE_TYPE = "content.export" as const;
export const MEASURE_NODE_TYPE = "analytics.ingest_snapshot" as const;
export const LEARN_NODE_TYPE = "learning.propose_from_roi" as const;

/** Built-in Daily Growth DSL — publish + validate + export + measure + learn required (RFC 05 / V1 DoD). */
export function createDailyGrowthDsl(): WorkflowDsl {
  return {
    schema_version: SCHEMA_VERSION,
    id: DAILY_GROWTH_TEMPLATE_ID,
    name: "Daily Growth",
    nodes: [
      { id: "research_keywords", type: "growth.research.keyword_pass" },
      { id: "decide", type: "growth.decision.emit_daily" },
      { id: "enqueue", type: "automation.planner.enqueue_from_decision" },
      { id: "generate", type: "content.generate" },
      { id: "validate", type: VALIDATE_NODE_TYPE },
      { id: "optimize", type: "content.optimize" },
      { id: "review_gate", type: "human.review" },
      { id: "publish", type: PUBLISH_NODE_TYPE },
      { id: "export", type: EXPORT_NODE_TYPE },
      { id: "measure", type: MEASURE_NODE_TYPE },
      { id: "learn", type: LEARN_NODE_TYPE },
    ],
    edges: [
      ["research_keywords", "decide"],
      ["decide", "enqueue"],
      ["enqueue", "generate"],
      ["generate", "validate"],
      ["validate", "optimize"],
      ["optimize", "review_gate"],
      ["review_gate", "publish"],
      ["review_gate", "export"],
      ["publish", "measure"],
      ["export", "measure"],
      ["measure", "learn"],
    ],
  };
}

export type DslValidationResult =
  | { ok: true; dsl: WorkflowDsl }
  | { ok: false; errors: string[] };

export function parseWorkflowDsl(input: unknown): DslValidationResult {
  const parsed = workflowDslSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => i.message),
    };
  }
  return { ok: true, dsl: parsed.data };
}

/** Daily Growth (and any template claiming that id) must include validate + publish + export + measure + learn. */
export function assertDailyGrowthRequirements(dsl: WorkflowDsl): DslValidationResult {
  const types = new Set(dsl.nodes.map((n) => n.type));
  const errors: string[] = [];
  if (!types.has(VALIDATE_NODE_TYPE)) {
    errors.push(`Daily Growth DSL missing required node type ${VALIDATE_NODE_TYPE}`);
  }
  if (!types.has(PUBLISH_NODE_TYPE)) {
    errors.push(`Daily Growth DSL missing required node type ${PUBLISH_NODE_TYPE}`);
  }
  if (!types.has(EXPORT_NODE_TYPE)) {
    errors.push(`Daily Growth DSL missing required node type ${EXPORT_NODE_TYPE}`);
  }
  if (!types.has(MEASURE_NODE_TYPE)) {
    errors.push(`Daily Growth DSL missing required node type ${MEASURE_NODE_TYPE}`);
  }
  if (!types.has(LEARN_NODE_TYPE)) {
    errors.push(`Daily Growth DSL missing required node type ${LEARN_NODE_TYPE}`);
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, dsl };
}

export function validateTemplateDsl(input: unknown): DslValidationResult {
  const parsed = parseWorkflowDsl(input);
  if (!parsed.ok) return parsed;
  if (parsed.dsl.id === DAILY_GROWTH_TEMPLATE_ID) {
    return assertDailyGrowthRequirements(parsed.dsl);
  }
  return parsed;
}
