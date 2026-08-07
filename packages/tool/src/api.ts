import { SCHEMA_VERSION } from "@clime/shared";
import type { ToolEngine } from "./engine.js";

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
 * ToolAPI handlers (S3A §5.14) — FS/OCR/browser profiles only.
 * Playwright remains in @clime/browser-automation.
 */
export function createToolDomainHandlers(
  engine: ToolEngine,
  options?: { generateJobId?: () => string },
): Record<string, DomainHandler> {
  const generateJobId =
    options?.generateJobId ??
    (() => `job_tool_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`);

  return {
    "tool.listProfiles": async () => engine.profiles.listProfiles(),

    "tool.pickFile": async (args) => {
      const filters = Array.isArray(args.filters)
        ? args.filters.filter((f): f is string => typeof f === "string")
        : undefined;
      const filePath = await engine.fs.pickFile({ filters });
      return { schema_version: SCHEMA_VERSION, filePath };
    },

    "tool.pickDirectory": async () => {
      const dirPath = await engine.fs.pickDirectory();
      return { schema_version: SCHEMA_VERSION, dirPath };
    },

    "tool.runOcr": async (args, ctx) => {
      const filePath = asString(args.filePath) || undefined;
      return engine.ocr.runOcr({
        filePath,
        traceId: ctx.traceId,
        generateJobId,
      });
    },
  };
}
