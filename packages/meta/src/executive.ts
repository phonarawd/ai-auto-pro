import { goalHorizonSchema, type GoalHorizon } from "@clime/shared";
import type { GoalManager } from "./goal-manager.js";
import { getGoalView, type MetaStorage } from "./persist.js";
import {
  ESTIMATE_LABEL,
  type ExecutiveExplain,
  type HorizonStatus,
  type ReallocationList,
} from "./schemas.js";

export type ExecutiveEngine = {
  getHorizon(input: {
    projectId: string;
    horizon?: GoalHorizon;
  }): Promise<HorizonStatus>;
  getReallocations(input: {
    projectId: string;
    horizon?: GoalHorizon;
  }): Promise<ReallocationList>;
  explainDecision(input: {
    projectId: string;
    decisionId?: string;
  }): Promise<ExecutiveExplain>;
};

function mergeMixCaps(
  goals: Awaited<ReturnType<GoalManager["getGoals"]>>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const g of goals) {
    const caps = g.kpi.mixCaps ?? {};
    for (const [k, v] of Object.entries(caps)) {
      out[k] = typeof v === "number" ? v : out[k] ?? 0;
    }
  }
  return out;
}

function buildConstraintHint(
  horizon: GoalHorizon,
  mixCaps: Record<string, number>,
  theme?: string,
): string {
  const parts = Object.entries(mixCaps).map(([k, v]) => `${k}≤${v}`);
  const mix = parts.length > 0 ? parts.join(", ") : "no mix caps";
  const themePart = theme ? `; theme: ${theme}` : "";
  return `${horizon}: ${mix}${themePart} (envelope only — Decision ranks today)`;
}

/**
 * Executive Engine — week/month/quarter envelopes + reallocations (JA).
 * Never writes DecisionRecord or Planner Queue.
 */
export function createExecutiveEngine(
  storage: MetaStorage,
  goals: GoalManager,
): ExecutiveEngine {
  return {
    async getHorizon(input) {
      const horizon = goalHorizonSchema.parse(input.horizon ?? "week");
      const list = await goals.getGoals(input.projectId, horizon);
      const active = list.filter((g) => g.status === "active");
      const mixCaps = mergeMixCaps(active.length > 0 ? active : list);
      const theme =
        active.find((g) => g.kpi.theme)?.kpi.theme ??
        list.find((g) => g.kpi.theme)?.kpi.theme;
      const status: HorizonStatus["status"] =
        list.length === 0
          ? "empty"
          : active.length === 0
            ? "paused"
            : "active";
      const constraintHint = buildConstraintHint(horizon, mixCaps, theme);
      return {
        schema_version: 1 as const,
        kind: "meta.horizon_status" as const,
        projectId: input.projectId,
        horizon,
        status,
        theme,
        mixCaps,
        goals: list,
        constraintHint,
        narrative:
          status === "empty"
            ? `No ${horizon} goals yet. Set a Goal envelope — Decision still owns daily rank.`
            : `Horizon ${horizon} envelope active. Executive constrains mix; Decision Engine alone ranks today.`,
      };
    },

    async getReallocations(input) {
      const horizon = goalHorizonSchema.parse(input.horizon ?? "week");
      const list = await goals.getGoals(input.projectId, horizon);
      const mixCaps = mergeMixCaps(list.filter((g) => g.status === "active"));
      const items: ReallocationList["items"] = [];

      const reels = mixCaps.reels ?? mixCaps.shorts;
      const blogs = mixCaps.blogs;
      if (typeof reels === "number" && typeof blogs === "number" && reels > blogs) {
        items.push({
          id: `realloc_${horizon}_reels`,
          summary: `Horizon mix favors reels/shorts (${reels}) over blogs (${blogs})`,
          fromFormat: "blogs",
          toFormat: "reels",
          deltaHint: reels - blogs,
          isEstimate: true,
          estimateLabel: ESTIMATE_LABEL,
          rationale:
            "Envelope mixCaps suggest shifting production toward short-form. Decision fills daily slots within this envelope.",
        });
      } else if (Object.keys(mixCaps).length > 0) {
        const top = Object.entries(mixCaps).sort((a, b) => b[1]! - a[1]!)[0];
        if (top) {
          items.push({
            id: `realloc_${horizon}_${top[0]}`,
            summary: `Protect ${top[0]} capacity (${top[1]}) this ${horizon}`,
            toFormat: top[0],
            deltaHint: top[1],
            isEstimate: true,
            estimateLabel: ESTIMATE_LABEL,
            rationale:
              "Primary mixCap from Goal envelope. Executive does not enqueue daily queue items.",
          });
        }
      }

      if (items.length === 0) {
        items.push({
          id: `realloc_${horizon}_none`,
          summary: `No reallocation signal for ${horizon} yet`,
          isEstimate: false,
          rationale:
            "Set Goal mixCaps or ROI-informed envelopes to generate recommendations.",
        });
      }

      return {
        schema_version: 1 as const,
        kind: "meta.reallocation_list" as const,
        projectId: input.projectId,
        horizon,
        items,
      };
    },

    async explainDecision(input) {
      const horizonNote =
        "Executive owns week/month/quarter only — Decision Engine alone ranks today.";
      if (!input.decisionId) {
        const week = await goals.getGoals(input.projectId, "week");
        return {
          schema_version: 1 as const,
          kind: "meta.executive_explain" as const,
          narrative:
            week.length > 0
              ? `Week goals: ${week.map((g) => g.title).join("; ")}. ${horizonNote}`
              : `No week goals. ${horizonNote}`,
          graph: null,
          horizonNote,
        };
      }

      const row = await storage.decisions.getById(input.decisionId);
      if (!row) {
        return {
          schema_version: 1 as const,
          kind: "meta.executive_explain" as const,
          decisionId: input.decisionId,
          narrative: `Decision ${input.decisionId} not found. ${horizonNote}`,
          graph: null,
          horizonNote,
        };
      }

      let graph: ExecutiveExplain["graph"] = null;
      if (row.graphJson) {
        try {
          const parsed = JSON.parse(row.graphJson) as {
            nodes?: unknown[];
            edges?: unknown[];
          };
          graph = {
            nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
            edges: Array.isArray(parsed.edges) ? parsed.edges : [],
          };
        } catch {
          graph = null;
        }
      }

      return {
        schema_version: 1 as const,
        kind: "meta.executive_explain" as const,
        decisionId: input.decisionId,
        narrative:
          (row.narrative?.trim() || "Decision recorded.") + ` ${horizonNote}`,
        graph,
        horizonNote,
      };
    },
  };
}

/** Convenience: resolve a goal for internal checks (unused export kept lean). */
export async function peekGoal(storage: MetaStorage, goalId: string) {
  return getGoalView(storage, goalId);
}
