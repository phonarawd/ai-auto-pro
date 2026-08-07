import type { TopicGeneratorEngine } from "./engine.js";

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

function asNullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value === "string") return value;
  return undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.filter((v): v is string => typeof v === "string");
  return out.length > 0 ? out : undefined;
}

function asPositiveInt(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.floor(value);
}

/**
 * Growth planning handlers — DA §7 `generateTopic`.
 */
export function createPlanningDomainHandlers(
  engine: TopicGeneratorEngine,
  options?: { defaultProjectId?: string },
): Record<string, DomainHandler> {
  const defaultProjectId = options?.defaultProjectId;

  return {
    "growth.generateTopic": async (args, ctx) => {
      const projectId = asString(
        args.projectId,
        ctx.projectId ?? defaultProjectId ?? "",
      );
      if (!projectId) {
        return {
          schema_version: 1,
          kind: "growth.topic_generate_result",
          projectId: "",
          topics: [],
          traceId: ctx.traceId,
          errors: ["projectId required"],
        };
      }
      return engine.generateTopic({
        projectId,
        missionId: asNullableString(args.missionId),
        missionGoal: asNullableString(args.missionGoal),
        decisionId: asNullableString(args.decisionId),
        decisionSummary: asNullableString(args.decisionSummary),
        trendIds: asStringArray(args.trendIds),
        maxTopics: asPositiveInt(args.maxTopics),
        traceId: ctx.traceId,
      });
    },
  };
}
