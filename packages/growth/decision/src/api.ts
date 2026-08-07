import { revenueCandidateSchema } from "@clime/growth-revenue";
import type { DecisionEngine } from "./engine.js";

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

function asPositiveInt(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.floor(value);
}

function parseCandidates(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const out = [];
  for (const item of value) {
    const parsed = revenueCandidateSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out.length > 0 ? out : undefined;
}

/**
 * Growth decision handlers — EA §5 (owns Mission Center today + Decision Graph).
 */
export function createDecisionDomainHandlers(
  engine: DecisionEngine,
  options?: { defaultProjectId?: string },
): Record<string, DomainHandler> {
  const defaultProjectId = options?.defaultProjectId;

  const resolveProjectId = (args: ArgRecord, ctx: { projectId?: string | null }) =>
    asString(args.projectId, ctx.projectId ?? defaultProjectId ?? "");

  return {
    "growth.runDailyDecision": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      if (!projectId) {
        return {
          schema_version: 1,
          ok: false,
          errors: ["projectId required"],
        };
      }
      return engine.runDailyDecision({
        projectId,
        missionDate: asString(args.missionDate) || undefined,
        candidates: parseCandidates(args.candidates),
        missionTitle: asString(args.missionTitle) || undefined,
        trendLabel: asString(args.trendLabel) || undefined,
        keywordLabel: asString(args.keywordLabel) || undefined,
        horizonHint: asString(args.horizonHint) || undefined,
        traceId: ctx.traceId,
      });
    },

    "growth.getMissionToday": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      if (!projectId) {
        return {
          schema_version: 1,
          missions: [],
          queueDepth: 0,
          errors: ["projectId required"],
        };
      }
      return engine.getMissionToday({
        projectId,
        missionDate: asString(args.missionDate) || undefined,
      });
    },

    "growth.getDecision": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      if (!projectId) {
        return { schema_version: 1, decision: null, errors: ["projectId required"] };
      }
      return engine.getDecision({
        projectId,
        decisionId: asString(args.decisionId) || undefined,
      });
    },

    "growth.explainDecision": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      if (!projectId) {
        return {
          schema_version: 1,
          explanation: "projectId required",
        };
      }
      return engine.explainDecision({
        projectId,
        decisionId: asString(args.decisionId) || undefined,
      });
    },

    "growth.listPlannerQueue": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      if (!projectId) return [];
      return engine.listPlannerQueue({
        projectId,
        limit: asPositiveInt(args.limit),
      });
    },
  };
}
