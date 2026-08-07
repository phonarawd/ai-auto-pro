import { generateJobId } from "./job-id.js";
import type { ContentEngine } from "./engine.js";

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

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

/**
 * ContentAPI handlers — C1A §9 / S3A content namespace.
 */
export function createContentApiHandlers(
  engine: ContentEngine,
  options?: {
    generateJobId?: () => string;
    /** Default filesystem root for exportPack when args omit exportRoot */
    defaultExportRoot?: string;
  },
) {
  const jobId = options?.generateJobId ?? generateJobId;
  const defaultExportRoot = options?.defaultExportRoot ?? process.cwd();

  return {
    "content.enqueueGenerate": async (
      args: {
        projectId?: string;
        prompt?: string;
        body?: string;
        title?: string;
      },
      ctx: { traceId: string; projectId?: string | null },
    ) => {
      const projectId = args.projectId ?? ctx.projectId;
      if (!projectId || typeof projectId !== "string") {
        return {
          schema_version: 1 as const,
          ok: false as const,
          errors: ["projectId required"],
          traceId: ctx.traceId,
        };
      }
      const body = args.body ?? args.prompt ?? "";
      const produced = await engine.produce({
        projectId,
        body,
        title: args.title,
        prompt: args.prompt,
        traceId: ctx.traceId,
      });
      const id = jobId();
      return {
        schema_version: 1 as const,
        jobId: id,
        traceId: ctx.traceId,
        contentItemId: produced.contentItemId,
      };
    },

    "content.getArtifact": async (args: { contentItemId?: string; artifactId?: string }) => {
      const id = args.contentItemId ?? args.artifactId;
      if (!id) return null;
      return engine.getArtifact(id);
    },

    "content.validate": async (
      args: { contentItemId?: string; artifactId?: string },
      ctx: { traceId: string },
    ) => {
      const id = args.contentItemId ?? args.artifactId;
      if (!id) {
        return {
          schema_version: 1 as const,
          valid: false,
          errors: ["contentItemId required"],
          traceId: ctx.traceId,
        };
      }
      return engine.validate({ contentItemId: id, traceId: ctx.traceId });
    },

    "content.optimize": async (
      args: { contentItemId?: string; artifactId?: string },
      ctx: { traceId: string },
    ) => {
      const id = args.contentItemId ?? args.artifactId;
      if (!id) {
        return {
          schema_version: 1 as const,
          jobId: jobId(),
          traceId: ctx.traceId,
          ok: false as const,
          errors: ["contentItemId required"],
        };
      }
      const result = await engine.optimize({
        contentItemId: id,
        traceId: ctx.traceId,
      });
      return {
        jobId: jobId(),
        ...result,
      };
    },

    "content.repurpose": async (
      args: {
        contentItemId?: string;
        artifactId?: string;
        projectId?: string;
        targetFormat?: string;
      },
      ctx: { traceId: string; projectId?: string | null },
    ) => {
      const id = args.contentItemId ?? args.artifactId;
      if (!id) {
        return {
          schema_version: 1 as const,
          jobId: jobId(),
          traceId: ctx.traceId,
          ok: false as const,
          errors: ["contentItemId required"],
        };
      }
      const result = await engine.repurpose({
        contentItemId: id,
        projectId:
          typeof args.projectId === "string"
            ? args.projectId
            : (ctx.projectId ?? undefined),
        traceId: ctx.traceId,
      });
      return {
        jobId: jobId(),
        ...result,
      };
    },

    "content.exportPack": async (
      args: {
        projectId?: string;
        contentItemIds?: string[];
        itemIds?: string[];
        exportRoot?: string;
        exportDate?: string;
      },
      ctx: { traceId: string; projectId?: string | null },
    ) => {
      const projectId = args.projectId ?? ctx.projectId;
      const ids = args.contentItemIds ?? args.itemIds ?? [];
      if (!projectId || typeof projectId !== "string") {
        return {
          schema_version: 1 as const,
          ok: false as const,
          errors: ["projectId required"],
          traceId: ctx.traceId,
        };
      }
      return engine.exportPack({
        projectId,
        contentItemIds: ids,
        exportRoot:
          typeof args.exportRoot === "string" ? args.exportRoot : defaultExportRoot,
        exportDate: args.exportDate,
        traceId: ctx.traceId,
      });
    },

    "content.listHistory": async (
      args: { projectId?: string; limit?: number },
      ctx: { projectId?: string | null },
    ) => {
      const projectId = args.projectId ?? ctx.projectId;
      if (!projectId || typeof projectId !== "string") return [];
      return engine.listHistory(
        projectId,
        typeof args.limit === "number" ? args.limit : 50,
      );
    },
  };
}

export function createContentDomainHandlers(
  engine: ContentEngine,
  options?: {
    generateJobId?: () => string;
    defaultExportRoot?: string;
  },
): Record<string, DomainHandler> {
  const api = createContentApiHandlers(engine, options);

  return {
    "content.enqueueGenerate": async (args, ctx) =>
      api["content.enqueueGenerate"](
        {
          projectId:
            typeof args.projectId === "string" ? args.projectId : undefined,
          prompt: typeof args.prompt === "string" ? args.prompt : undefined,
          body: typeof args.body === "string" ? args.body : undefined,
          title: typeof args.title === "string" ? args.title : undefined,
        },
        ctx,
      ),

    "content.getArtifact": async (args) =>
      api["content.getArtifact"]({
        contentItemId: asString(args.contentItemId || args.artifactId) || undefined,
        artifactId: asString(args.artifactId) || undefined,
      }),

    "content.validate": async (args, ctx) =>
      api["content.validate"](
        {
          contentItemId: asString(args.contentItemId || args.artifactId) || undefined,
          artifactId: asString(args.artifactId) || undefined,
        },
        ctx,
      ),

    "content.optimize": async (args, ctx) =>
      api["content.optimize"](
        {
          contentItemId: asString(args.contentItemId || args.artifactId) || undefined,
        },
        ctx,
      ),

    "content.repurpose": async (args, ctx) =>
      api["content.repurpose"](
        {
          contentItemId: asString(args.contentItemId || args.artifactId) || undefined,
          projectId:
            typeof args.projectId === "string" ? args.projectId : undefined,
          targetFormat:
            typeof args.targetFormat === "string" ? args.targetFormat : undefined,
        },
        ctx,
      ),

    "content.exportPack": async (args, ctx) =>
      api["content.exportPack"](
        {
          projectId:
            typeof args.projectId === "string" ? args.projectId : undefined,
          contentItemIds: asStringArray(args.contentItemIds ?? args.itemIds),
          exportRoot:
            typeof args.exportRoot === "string" ? args.exportRoot : undefined,
          exportDate:
            typeof args.exportDate === "string" ? args.exportDate : undefined,
        },
        ctx,
      ),

    "content.listHistory": async (args, ctx) =>
      api["content.listHistory"](
        {
          projectId:
            typeof args.projectId === "string" ? args.projectId : undefined,
          limit: typeof args.limit === "number" ? args.limit : undefined,
        },
        ctx,
      ),
  };
}
