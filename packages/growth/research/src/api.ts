import { generateJobId } from "./job-id.js";
import type { ResearchEngine } from "./engine.js";

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

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.filter((v): v is string => typeof v === "string");
  return out.length > 0 ? out : undefined;
}

/**
 * Growth research handlers — DA §7.
 */
export function createResearchDomainHandlers(
  engine: ResearchEngine,
  options?: {
    generateJobId?: () => string;
    defaultProjectId?: string;
  },
): Record<string, DomainHandler> {
  const jobId = options?.generateJobId ?? generateJobId;
  const defaultProjectId = options?.defaultProjectId;

  const resolveProjectId = (args: ArgRecord, ctx: { projectId?: string | null }) =>
    asString(args.projectId, ctx.projectId ?? defaultProjectId ?? "");

  return {
    "growth.getKeywordGraph": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      if (!projectId) {
        return {
          schema_version: 1,
          kind: "growth.keyword_graph",
          projectId: "",
          updatedAt: new Date().toISOString(),
          nodes: [],
          edges: [],
          errors: ["projectId required"],
        };
      }
      return engine.getKeywordGraph(projectId);
    },

    "growth.runResearchJob": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      if (!projectId) {
        return {
          schema_version: 1,
          jobId: jobId(),
          traceId: ctx.traceId,
          ok: false,
          errors: ["projectId required"],
        };
      }
      const result = await engine.runResearchJob({
        projectId,
        topic: asString(args.topic) || undefined,
        traceId: ctx.traceId,
      });
      return {
        schema_version: 1 as const,
        jobId: result.jobId,
        traceId: result.traceId,
        trendCount: result.trendCount,
        graphNodeCount: result.graphNodeCount,
      };
    },

    "growth.getNormalizedTrends": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      if (!projectId) {
        return { schema_version: 1, trends: [], errors: ["projectId required"] };
      }
      const trends = await engine.getNormalizedTrends(projectId);
      return { schema_version: 1 as const, trends };
    },

    "growth.buildMultiJackHook": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      const trendId = asString(args.trendId);
      if (!projectId || !trendId) {
        return {
          schema_version: 1,
          ok: false,
          code: "INVALID_ARGS",
          message: "projectId and trendId required",
        };
      }
      return engine.buildMultiJackHook({
        projectId,
        trendId,
        personaHints: asStringArray(args.personaHints),
      });
    },

    "growth.getBrandRules": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      if (!projectId) {
        return {
          schema_version: 1,
          kind: "growth.brand_rules",
          projectId: "",
          updatedAt: new Date().toISOString(),
          forbiddenPhrases: [],
          offBrandPhrases: [],
          requiredPhrases: [],
          errors: ["projectId required"],
        };
      }
      return engine.getBrandRules(projectId);
    },

    "growth.setBrandRules": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      if (!projectId) {
        return {
          schema_version: 1,
          ok: false,
          code: "INVALID_ARGS",
          message: "projectId required",
        };
      }
      const doc = await engine.setBrandRules({
        projectId,
        tone: asString(args.tone) || undefined,
        voice: asString(args.voice) || undefined,
        forbiddenPhrases: asStringArray(args.forbiddenPhrases),
        offBrandPhrases: asStringArray(args.offBrandPhrases),
        requiredPhrases: asStringArray(args.requiredPhrases),
      });
      return { schema_version: 1 as const, ok: true as const, brand: doc };
    },

    "growth.getPersonaPrefs": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      if (!projectId) {
        return {
          schema_version: 1,
          kind: "growth.persona_prefs",
          projectId: "",
          updatedAt: new Date().toISOString(),
          personas: [],
          emotions: [],
          errors: ["projectId required"],
        };
      }
      return engine.getPersonaPrefs(projectId);
    },

    "growth.setPersonaPrefs": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      if (!projectId) {
        return {
          schema_version: 1,
          ok: false,
          code: "INVALID_ARGS",
          message: "projectId required",
        };
      }
      const personas = Array.isArray(args.personas)
        ? args.personas.filter((v): v is string => typeof v === "string")
        : undefined;
      const emotions = Array.isArray(args.emotions)
        ? args.emotions.filter((v): v is string => typeof v === "string")
        : undefined;
      const doc = await engine.setPersonaPrefs({
        projectId,
        personas,
        emotions,
        notes:
          typeof args.notes === "string" ? args.notes : undefined,
      });
      return { schema_version: 1 as const, ok: true as const, prefs: doc };
    },

    "growth.runResearcherJob": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      if (!projectId) {
        return {
          schema_version: 1,
          jobId: jobId(),
          traceId: ctx.traceId,
          ok: false,
          errors: ["projectId required"],
        };
      }
      const result = await engine.runResearcherJob({
        projectId,
        traceId: ctx.traceId,
      });
      return {
        schema_version: 1 as const,
        jobId: result.jobId,
        traceId: result.traceId,
        report: result.report,
      };
    },

    "growth.runCompetitorTeardown": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      const targetUrl = asString(args.targetUrl);
      if (!projectId || !targetUrl) {
        return {
          schema_version: 1,
          ok: false,
          code: "INVALID_ARGS",
          message: "projectId and targetUrl required",
        };
      }
      return engine.runCompetitorTeardown({ projectId, targetUrl });
    },

    "growth.runMicroAudit": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      const sourceUrl = asString(args.sourceUrl);
      if (!projectId || !sourceUrl) {
        return {
          schema_version: 1,
          ok: false,
          code: "INVALID_ARGS",
          message: "projectId and sourceUrl required",
        };
      }
      const sourceKindRaw = asString(args.sourceKind);
      const sourceKind =
        sourceKindRaw === "public_url" ||
        sourceKindRaw === "public_sns" ||
        sourceKindRaw === "public_rss" ||
        sourceKindRaw === "fixture"
          ? sourceKindRaw
          : undefined;
      return engine.runMicroAudit({
        projectId,
        sourceUrl,
        sourceKind,
        targetUrl: asString(args.targetUrl) || undefined,
      });
    },

    "growth.getMicroAudit": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      if (!projectId) {
        return { schema_version: 1, audit: null, errors: ["projectId required"] };
      }
      const audit = await engine.getMicroAudit(projectId);
      return { schema_version: 1 as const, audit };
    },

    "growth.analyzeGap": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      if (!projectId) {
        return {
          schema_version: 1,
          ok: false,
          code: "INVALID_ARGS",
          message: "projectId required",
        };
      }
      return engine.analyzeGap({ projectId });
    },

    "growth.scoreOpportunity": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      if (!projectId) {
        return {
          schema_version: 1,
          ok: false,
          code: "INVALID_ARGS",
          message: "projectId required",
        };
      }
      return engine.scoreOpportunity({ projectId });
    },

    "growth.analyzeViral": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      if (!projectId) {
        return {
          schema_version: 1,
          ok: false,
          code: "INVALID_ARGS",
          message: "projectId required",
        };
      }
      return engine.analyzeViral({ projectId });
    },

    "growth.exportMicroAuditViral": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      const exportRoot = asString(args.exportRoot);
      if (!projectId || !exportRoot) {
        return {
          schema_version: 1,
          ok: false,
          code: "INVALID_ARGS",
          message: "projectId and exportRoot required",
        };
      }
      const result = await engine.exportMicroAuditViral({
        projectId,
        exportRoot,
        exportDate: asString(args.exportDate) || undefined,
        referralCode: asString(args.referralCode) || undefined,
        locale: asString(args.locale) || undefined,
      });
      return { schema_version: 1 as const, ...result };
    },

    "growth.buildMultiJackPack": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      const trendId = asString(args.trendId);
      if (!projectId || !trendId) {
        return {
          schema_version: 1,
          ok: false,
          code: "INVALID_ARGS",
          message: "projectId and trendId required",
        };
      }
      return engine.buildMultiJackPack({
        projectId,
        trendId,
        personaHints: asStringArray(args.personaHints),
      });
    },
  };
}
