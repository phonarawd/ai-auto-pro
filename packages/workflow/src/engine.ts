import {
  SCHEMA_VERSION,
  taskStateSchema,
  type TaskState,
} from "@clime/shared";
import type {
  ClimeStorage,
  WorkflowRunRow,
} from "@clime/storage";
import {
  buildClimePlaybook,
  importClimePlaybookFile,
  parseClimePlaybook,
  writeClimePlaybookFile,
  type ClimePlaybookExportInput,
  type ClimePlaybookExportResult,
  type ClimePlaybookImportResult,
} from "./clime-playbook.js";
import {
  createDailyGrowthDsl,
  DAILY_GROWTH_TEMPLATE_ID,
  validateTemplateDsl,
  type WorkflowDsl,
} from "./dsl.js";
import { checkTransition, isHardTerminal } from "./task-sm.js";
import {
  buildPartialFailureCursor,
  type EngineTransitionResult,
  type PartialFailureInput,
  type TransitionRequest,
  type WorkflowTemplate,
} from "./types.js";

export type WorkflowStorage = Pick<ClimeStorage, "workflowRuns">;

export type WorkflowEngine = {
  listTemplates: () => WorkflowTemplate[];
  getTemplate: (templateId: string) => WorkflowTemplate | null;
  createRun: (input: {
    projectId: string;
    templateId?: string;
    dsl?: unknown;
    queueItemId?: string | null;
    missionId?: string | null;
    decisionId?: string | null;
    traceId: string;
  }) => Promise<
    | { ok: true; workflowRunId: string; state: "QUEUED"; version: number }
    | { ok: false; errors: string[]; traceId: string }
  >;
  getRun: (workflowRunId: string) => Promise<WorkflowRunRow | null>;
  listRuns: (projectId: string, limit?: number) => Promise<WorkflowRunRow[]>;
  transition: (req: TransitionRequest) => Promise<EngineTransitionResult>;
  stopOnPartialFailure: (
    input: PartialFailureInput,
  ) => Promise<EngineTransitionResult>;
  cancelRun: (input: {
    workflowRunId: string;
    traceId: string;
  }) => Promise<EngineTransitionResult>;
  resumeRun: (input: {
    workflowRunId: string;
    traceId: string;
    to?: TaskState;
  }) => Promise<EngineTransitionResult>;
  /** vg-d — serialize .clime playbook (≠ Export backup). */
  exportClimePlaybook: (
    input: ClimePlaybookExportInput & { filePath?: string },
  ) => ClimePlaybookExportResult & { filePath?: string };
  /** vg-d — import .clime → template registry; never auto-START. */
  importClimePlaybook: (input: {
    filePath?: string;
    playbook?: unknown;
    traceId: string;
  }) => ClimePlaybookImportResult;
};

function builtinTemplates(): WorkflowTemplate[] {
  const dsl = createDailyGrowthDsl();
  return [
    {
      schema_version: SCHEMA_VERSION,
      id: dsl.id,
      name: dsl.name,
      dsl,
    },
  ];
}

export function createWorkflowEngine(storage: WorkflowStorage): WorkflowEngine {
  const imported = new Map<string, WorkflowTemplate>();

  const allTemplates = (): WorkflowTemplate[] => [
    ...builtinTemplates(),
    ...imported.values(),
  ];

  const resolveDsl = (
    templateId: string | undefined,
    dslInput: unknown,
  ): { ok: true; dsl: WorkflowDsl } | { ok: false; errors: string[] } => {
    if (dslInput != null) {
      const v = validateTemplateDsl(dslInput);
      if (!v.ok) return v;
      return { ok: true, dsl: v.dsl };
    }
    const id = templateId ?? DAILY_GROWTH_TEMPLATE_ID;
    const t = allTemplates().find((x) => x.id === id);
    if (!t) return { ok: false, errors: [`Unknown template: ${id}`] };
    const v = validateTemplateDsl(t.dsl);
    if (!v.ok) return v;
    return { ok: true, dsl: v.dsl };
  };

  const engine: WorkflowEngine = {
    listTemplates: () => allTemplates(),

    getTemplate(templateId) {
      return allTemplates().find((t) => t.id === templateId) ?? null;
    },

    async createRun(input) {
      const resolved = resolveDsl(input.templateId, input.dsl);
      if (!resolved.ok) {
        return { ok: false, errors: resolved.errors, traceId: input.traceId };
      }
      const { id } = await storage.workflowRuns.create({
        projectId: input.projectId,
        queueItemId: input.queueItemId ?? null,
        missionId: input.missionId ?? null,
        decisionId: input.decisionId ?? null,
        dslJson: JSON.stringify(resolved.dsl),
        state: "QUEUED",
        cursorJson: null,
        traceId: input.traceId,
      });
      return { ok: true, workflowRunId: id, state: "QUEUED", version: 1 };
    },

    getRun(workflowRunId) {
      return storage.workflowRuns.getById(workflowRunId);
    },

    listRuns(projectId, limit = 50) {
      return storage.workflowRuns.listByProject(projectId, limit);
    },

    async transition(req) {
      const run = await storage.workflowRuns.getById(req.workflowRunId);
      if (!run) {
        return {
          ok: false,
          reason: "not_found",
          message: `WorkflowRun not found: ${req.workflowRunId}`,
          traceId: req.traceId,
        };
      }
      const from = taskStateSchema.parse(run.state);
      const legal = checkTransition(from, req.to);
      if (!legal.ok) {
        return {
          ok: false,
          reason: legal.code === "VALIDATE_SKIP" ? "validate_skip" : "illegal",
          message: legal.message,
          traceId: req.traceId,
        };
      }

      const expectedVersion = req.expectedVersion ?? run.version;
      const expectedUpdatedAt = req.expectedUpdatedAt ?? run.updatedAt;
      const result = await storage.workflowRuns.transitionWithLock(
        req.workflowRunId,
        {
          expectedVersion,
          expectedUpdatedAt,
          state: req.to,
          cursorJson: req.cursorJson,
        },
      );
      if (!result.ok) {
        return {
          ok: false,
          reason: result.reason,
          message:
            result.reason === "conflict"
              ? `Optimistic lock conflict on ${req.workflowRunId}`
              : `WorkflowRun not found: ${req.workflowRunId}`,
          traceId: req.traceId,
        };
      }
      return {
        ok: true,
        from,
        to: req.to,
        version: result.version,
        updatedAt: result.updatedAt,
        traceId: req.traceId,
      };
    },

    async stopOnPartialFailure(input) {
      const terminal = input.terminal ?? "FAILED";
      const cursorJson = buildPartialFailureCursor({
        nodeId: input.nodeId,
        error: input.error,
        traceId: input.traceId,
      });
      return engine.transition({
        workflowRunId: input.workflowRunId,
        to: terminal,
        traceId: input.traceId,
        cursorJson,
      });
    },

    async cancelRun(input) {
      return engine.transition({
        workflowRunId: input.workflowRunId,
        to: "CANCELLED",
        traceId: input.traceId,
      });
    },

    async resumeRun(input) {
      const run = await storage.workflowRuns.getById(input.workflowRunId);
      if (!run) {
        return {
          ok: false,
          reason: "not_found",
          message: `WorkflowRun not found: ${input.workflowRunId}`,
          traceId: input.traceId,
        };
      }
      const from = taskStateSchema.parse(run.state);
      if (isHardTerminal(from)) {
        return {
          ok: false,
          reason: "illegal",
          message: `Cannot resume from terminal ${from}`,
          traceId: input.traceId,
        };
      }
      const to = input.to ?? "RUNNING";
      return engine.transition({
        workflowRunId: input.workflowRunId,
        to,
        traceId: input.traceId,
      });
    },

    exportClimePlaybook(input) {
      if (input.filePath) {
        return writeClimePlaybookFile(input.filePath, input);
      }
      return buildClimePlaybook(input);
    },

    importClimePlaybook(input) {
      const result = input.filePath
        ? importClimePlaybookFile(input.filePath, { traceId: input.traceId })
        : parseClimePlaybook(input.playbook);
      if (!result.ok) {
        return { ...result, traceId: input.traceId };
      }
      imported.set(result.template.id, result.template);
      return { ...result, autoStarted: false as const };
    },
  };

  return engine;
}
