import type { AnalyticsEngine } from "./engine.js";
import type { ExperimentArm } from "./schemas.js";

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

function asNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value !== "boolean") return undefined;
  return value;
}

function asArms(value: unknown): ExperimentArm[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: ExperimentArm[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const arm = raw as Record<string, unknown>;
    if (typeof arm.id !== "string" || typeof arm.label !== "string") continue;
    const variantKind =
      arm.variantKind === "control" ||
      arm.variantKind === "title" ||
      arm.variantKind === "thumb" ||
      arm.variantKind === "cta" ||
      arm.variantKind === "other"
        ? arm.variantKind
        : "other";
    out.push({
      id: arm.id,
      label: arm.label,
      variantKind,
      payload:
        arm.payload && typeof arm.payload === "object"
          ? (arm.payload as Record<string, unknown>)
          : undefined,
    });
  }
  return out.length > 0 ? out : undefined;
}

/**
 * AnalyticsAPI handlers — RFC 09 / S3A analytics namespace.
 * createExperiment enforces HumanGate on spend; autoSpendApplied always 0.
 */
export function createAnalyticsDomainHandlers(
  engine: AnalyticsEngine,
  options?: { defaultProjectId?: string },
): Record<string, DomainHandler> {
  const defaultProjectId = options?.defaultProjectId;

  return {
    "analytics.listExperiments": async (args, ctx) => {
      const projectId = asString(
        args.projectId,
        ctx.projectId ?? defaultProjectId ?? "",
      );
      if (!projectId) return [];
      return engine.listExperiments(projectId);
    },

    "analytics.createExperiment": async (args, ctx) => {
      const projectId = asString(
        args.projectId,
        ctx.projectId ?? defaultProjectId ?? "",
      );
      const name = asString(args.name, "").trim();
      if (!projectId || !name) {
        return {
          schema_version: 1,
          kind: "analytics.create_experiment_result",
          ok: false,
          humanGateRequired: false,
          autoSpendApplied: 0,
          spendRequested: null,
          message: "projectId and name required",
          traceId: ctx.traceId,
        };
      }
      return engine.createExperiment({
        projectId,
        name,
        arms: asArms(args.arms),
        spend: asNumber(args.spend),
        humanApproved: asBoolean(args.humanApproved),
        traceId: ctx.traceId,
      });
    },
  };
}
