import type { GoalHorizon } from "@clime/shared";
import type { ExecutiveEngine } from "./executive.js";
import type { GoalManager } from "./goal-manager.js";
import type { GoalStatus, KpiItem } from "./schemas.js";

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
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

function asHorizon(value: unknown): GoalHorizon | undefined {
  if (value === "week" || value === "month" || value === "quarter") return value;
  return undefined;
}

function asKpis(value: unknown): KpiItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: KpiItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const key = asString(rec.key);
    const target = asNumber(rec.target);
    if (!key || target === undefined) continue;
    out.push({
      key,
      target,
      unit: asString(rec.unit) || undefined,
      current: asNumber(rec.current),
    });
  }
  return out;
}

function asMixCaps(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function asStatus(value: unknown): GoalStatus | undefined {
  if (
    value === "active" ||
    value === "paused" ||
    value === "done" ||
    value === "archived"
  ) {
    return value;
  }
  return undefined;
}

/**
 * ExecutiveAPI handlers — JA / S3A.
 * Daily queue / Decision writes are forbidden in this package.
 */
export function createExecutiveDomainHandlers(
  executive: ExecutiveEngine,
  goalManager: GoalManager,
  options?: { defaultProjectId?: string },
): Record<string, DomainHandler> {
  const defaultProjectId = options?.defaultProjectId;

  return {
    "executive.getGoals": async (args, ctx) => {
      const projectId = asString(
        args.projectId,
        ctx.projectId ?? defaultProjectId ?? "",
      );
      if (!projectId) return [];
      return goalManager.getGoals(projectId, asHorizon(args.horizon));
    },

    "executive.setGoal": async (args, ctx) => {
      const projectId = asString(
        args.projectId,
        ctx.projectId ?? defaultProjectId ?? "",
      );
      const horizon = asHorizon(args.horizon);
      const title =
        asString(args.title).trim() || asString(args.name).trim();
      if (!projectId || !horizon || !title) {
        return { schema_version: 1 as const, goalId: "", ok: false };
      }
      return goalManager.setGoal({
        projectId,
        goalId: asString(args.goalId) || undefined,
        horizon,
        title,
        target: asNumber(args.target),
        theme: asString(args.theme) || undefined,
        kpis: asKpis(args.kpis),
        mixCaps: asMixCaps(args.mixCaps),
        status: asStatus(args.status),
        notes: asString(args.notes) || undefined,
      });
    },

    "executive.getHorizon": async (args, ctx) => {
      const projectId = asString(
        args.projectId,
        ctx.projectId ?? defaultProjectId ?? "",
      );
      if (!projectId) {
        return {
          schema_version: 1,
          kind: "meta.horizon_status",
          projectId: "",
          horizon: "week",
          status: "empty",
          mixCaps: {},
          goals: [],
          constraintHint: "",
          narrative: "projectId required",
        };
      }
      return executive.getHorizon({
        projectId,
        horizon: asHorizon(args.horizon),
      });
    },

    "executive.explainDecision": async (args, ctx) => {
      const projectId = asString(
        args.projectId,
        ctx.projectId ?? defaultProjectId ?? "",
      );
      return executive.explainDecision({
        projectId,
        decisionId: asString(args.decisionId) || undefined,
      });
    },

    "executive.getReallocations": async (args, ctx) => {
      const projectId = asString(
        args.projectId,
        ctx.projectId ?? defaultProjectId ?? "",
      );
      if (!projectId) {
        return {
          schema_version: 1,
          kind: "meta.reallocation_list",
          projectId: "",
          horizon: "week",
          items: [],
        };
      }
      return executive.getReallocations({
        projectId,
        horizon: asHorizon(args.horizon),
      });
    },

    "executive.linkMission": async (args) => {
      const goalId = asString(args.goalId);
      const missionId = asString(args.missionId);
      if (!goalId || !missionId) {
        return { schema_version: 1 as const, linked: false, goalId };
      }
      return goalManager.linkMission({
        goalId,
        missionId,
        title: asString(args.title) || undefined,
      });
    },

    "executive.getGoalChain": async (args) => {
      const goalId = asString(args.goalId);
      if (!goalId) return null;
      return goalManager.getGoalChain(goalId);
    },
  };
}
