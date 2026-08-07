import type { WorkflowDsl } from "./dsl.js";
import type { WorkflowEngine } from "./engine.js";

type ArgRecord = Record<string, unknown>;

type DomainHandler = (
  args: ArgRecord,
  context: {
    requestId: string;
    traceId: string;
    projectId?: string | null;
  },
) => Promise<unknown>;

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/**
 * WorkflowAPI handlers — B3A §6.1 / S3A workflow namespace.
 */
export function createWorkflowApiHandlers(engine: WorkflowEngine) {
  return {
    "workflow.listTemplates": async () => engine.listTemplates(),

    "workflow.getTemplate": async (args: { templateId: string }) =>
      engine.getTemplate(args.templateId),

    "workflow.createRun": async (
      args: {
        templateId?: string;
        projectId?: string;
        dsl?: unknown;
      },
      ctx: { traceId: string; projectId?: string | null },
    ) => {
      const projectId = args.projectId ?? ctx.projectId;
      if (!projectId || typeof projectId !== "string") {
        return {
          schema_version: 1 as const,
          ok: false as const,
          errors: ["projectId required"],
        };
      }
      const created = await engine.createRun({
        projectId,
        templateId: args.templateId,
        dsl: args.dsl,
        traceId: ctx.traceId,
      });
      if (!created.ok) {
        return {
          schema_version: 1 as const,
          ok: false as const,
          errors: created.errors,
          traceId: created.traceId,
        };
      }
      return {
        schema_version: 1 as const,
        workflowRunId: created.workflowRunId,
        state: "QUEUED" as const,
      };
    },

    "workflow.getRun": async (args: { workflowRunId: string }) =>
      engine.getRun(args.workflowRunId),

    "workflow.listRuns": async (
      args: { projectId?: string; limit?: number },
      ctx: { projectId?: string | null },
    ) => {
      const projectId = args.projectId ?? ctx.projectId;
      if (!projectId || typeof projectId !== "string") return [];
      return engine.listRuns(
        projectId,
        typeof args.limit === "number" ? args.limit : 50,
      );
    },

    "workflow.resumeRun": async (
      args: { workflowRunId: string },
      ctx: { traceId: string },
    ) => {
      const result = await engine.resumeRun({
        workflowRunId: args.workflowRunId,
        traceId: ctx.traceId,
      });
      return {
        schema_version: 1 as const,
        resumed: result.ok,
        ...(result.ok ? {} : { error: result.message, traceId: result.traceId }),
      };
    },

    "workflow.cancelRun": async (
      args: { workflowRunId: string },
      ctx: { traceId: string },
    ) => {
      const result = await engine.cancelRun({
        workflowRunId: args.workflowRunId,
        traceId: ctx.traceId,
      });
      return {
        schema_version: 1 as const,
        cancelled: result.ok,
        ...(result.ok ? {} : { error: result.message, traceId: result.traceId }),
      };
    },

    "workflow.exportClimePlaybook": async (args: {
      title: string;
      summary?: string;
      authorLabel?: string;
      filePath?: string;
      referralCode?: string;
      includeReferral?: boolean;
      dsl?: unknown;
    }) => {
      const result = engine.exportClimePlaybook({
        title: args.title,
        summary: args.summary,
        authorLabel: args.authorLabel,
        filePath: args.filePath,
        referralCode: args.referralCode,
        includeReferral: args.includeReferral,
        dsl:
          args.dsl && typeof args.dsl === "object"
            ? (args.dsl as WorkflowDsl)
            : undefined,
      });
      return { schema_version: 1 as const, ...result };
    },

    "workflow.importClimePlaybook": async (
      args: { filePath?: string; playbook?: unknown },
      ctx: { traceId: string },
    ) => {
      const result = engine.importClimePlaybook({
        filePath: args.filePath,
        playbook: args.playbook,
        traceId: ctx.traceId,
      });
      return { schema_version: 1 as const, ...result };
    },
  };
}

export function createWorkflowDomainHandlers(
  engine: WorkflowEngine,
): Record<string, DomainHandler> {
  const api = createWorkflowApiHandlers(engine);

  return {
    "workflow.listTemplates": async () => api["workflow.listTemplates"](),

    "workflow.getTemplate": async (args) =>
      api["workflow.getTemplate"]({ templateId: asString(args.templateId) }),

    "workflow.createRun": async (args, ctx) =>
      api["workflow.createRun"](
        {
          templateId:
            typeof args.templateId === "string" ? args.templateId : undefined,
          projectId:
            typeof args.projectId === "string" ? args.projectId : undefined,
          dsl: args.dsl,
        },
        ctx,
      ),

    "workflow.getRun": async (args) =>
      api["workflow.getRun"]({ workflowRunId: asString(args.workflowRunId) }),

    "workflow.listRuns": async (args, ctx) =>
      api["workflow.listRuns"](
        {
          projectId:
            typeof args.projectId === "string" ? args.projectId : undefined,
          limit: typeof args.limit === "number" ? args.limit : undefined,
        },
        ctx,
      ),

    "workflow.resumeRun": async (args, ctx) =>
      api["workflow.resumeRun"](
        { workflowRunId: asString(args.workflowRunId) },
        ctx,
      ),

    "workflow.cancelRun": async (args, ctx) =>
      api["workflow.cancelRun"](
        { workflowRunId: asString(args.workflowRunId) },
        ctx,
      ),

    "workflow.exportClimePlaybook": async (args) =>
      api["workflow.exportClimePlaybook"]({
        title: asString(args.title) || "Untitled playbook",
        summary: asString(args.summary) || undefined,
        authorLabel: asString(args.authorLabel) || undefined,
        filePath: asString(args.filePath) || undefined,
        referralCode: asString(args.referralCode) || undefined,
        includeReferral:
          typeof args.includeReferral === "boolean"
            ? args.includeReferral
            : undefined,
        dsl: args.dsl,
      }),

    "workflow.importClimePlaybook": async (args, ctx) =>
      api["workflow.importClimePlaybook"](
        {
          filePath: asString(args.filePath) || undefined,
          playbook: args.playbook,
        },
        ctx,
      ),
  };
}
