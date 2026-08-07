import { z } from "zod";
import {
  SCHEMA_VERSION,
  schemaVersionSchema,
  withSchemaVersionSchema,
  type TaskState,
} from "@clime/shared";
import type { WorkflowDsl } from "./dsl.js";

export const workflowCursorSchema = withSchemaVersionSchema({
  nodeId: z.string().optional(),
  error: z.string().optional(),
  traceId: z.string().min(1),
  stoppedAt: z.string().optional(),
  visitedStates: z.array(z.string()).optional(),
});

export type WorkflowCursor = z.infer<typeof workflowCursorSchema>;

export type WorkflowTemplate = {
  schema_version: 1;
  id: string;
  name: string;
  dsl: WorkflowDsl;
};

export type PartialFailureInput = {
  workflowRunId: string;
  nodeId: string;
  error: string;
  traceId: string;
  /** challenge → PAUSED_CHALLENGE; otherwise FAILED */
  terminal?: "FAILED" | "PAUSED_CHALLENGE";
};

export type TransitionRequest = {
  workflowRunId: string;
  to: TaskState;
  traceId: string;
  cursorJson?: string | null;
  expectedVersion?: number;
  expectedUpdatedAt?: string;
};

export type EngineTransitionResult =
  | {
      ok: true;
      from: TaskState;
      to: TaskState;
      version: number;
      updatedAt: string;
      traceId: string;
    }
  | {
      ok: false;
      reason:
        | "not_found"
        | "conflict"
        | "illegal"
        | "validate_skip"
        | "storage";
      message: string;
      traceId: string;
    };

export function buildPartialFailureCursor(input: {
  nodeId: string;
  error: string;
  traceId: string;
  visitedStates?: TaskState[];
}): string {
  const cursor: WorkflowCursor = {
    schema_version: SCHEMA_VERSION,
    nodeId: input.nodeId,
    error: input.error,
    traceId: input.traceId,
    stoppedAt: new Date().toISOString(),
    visitedStates: input.visitedStates,
  };
  workflowCursorSchema.parse(cursor);
  return JSON.stringify(cursor);
}

export { schemaVersionSchema };
