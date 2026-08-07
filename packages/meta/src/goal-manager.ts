import { goalHorizonSchema, type GoalHorizon } from "@clime/shared";
import {
  getGoalView,
  listGoalViews,
  serializeKpiData,
  type MetaStorage,
} from "./persist.js";
import {
  goalKpiDataSchema,
  goalStatusSchema,
  type GoalChain,
  type GoalKpiData,
  type GoalStatus,
  type GoalView,
  type KpiItem,
} from "./schemas.js";

export type SetGoalInput = {
  projectId: string;
  goalId?: string;
  horizon: GoalHorizon;
  title: string;
  target?: number;
  theme?: string;
  kpis?: KpiItem[];
  mixCaps?: Record<string, number>;
  status?: GoalStatus;
  notes?: string;
};

export type LinkMissionInput = {
  goalId: string;
  missionId: string;
  title?: string;
  now?: Date;
};

/**
 * Goal Manager — Goal→KPI→Mission chain (JA).
 * Does not rank daily Missions or enqueue Planner Queue.
 */
export function createGoalManager(storage: MetaStorage) {
  return {
    async setGoal(
      input: SetGoalInput,
    ): Promise<{ schema_version: 1; goalId: string }> {
      const horizon = goalHorizonSchema.parse(input.horizon);
      const title = input.title.trim();
      if (!title) {
        throw new Error("Goal title required");
      }
      const status = goalStatusSchema.parse(input.status ?? "active");

      let existingKpi: GoalKpiData | null = null;
      if (input.goalId) {
        const existing = await getGoalView(storage, input.goalId);
        if (existing) existingKpi = existing.kpi;
      }

      const kpi = goalKpiDataSchema.parse({
        kind: "meta.goal_kpi",
        target: input.target ?? existingKpi?.target,
        theme: input.theme ?? existingKpi?.theme,
        kpis: input.kpis ?? existingKpi?.kpis ?? [],
        mixCaps: input.mixCaps ?? existingKpi?.mixCaps,
        missionLinks: existingKpi?.missionLinks ?? [],
        notes: input.notes ?? existingKpi?.notes,
      });

      const kpiJson = serializeKpiData(kpi);

      if (input.goalId) {
        const row = await storage.goals.getById(input.goalId);
        if (row) {
          await storage.goals.update(input.goalId, {
            projectId: input.projectId,
            horizon,
            title,
            kpiJson,
            status,
          });
          return { schema_version: 1 as const, goalId: input.goalId };
        }
      }

      const created = await storage.goals.create({
        projectId: input.projectId,
        horizon,
        title,
        kpiJson,
        status,
      });
      return { schema_version: 1 as const, goalId: created.id };
    },

    async getGoals(
      projectId: string,
      horizon?: GoalHorizon,
    ): Promise<GoalView[]> {
      return listGoalViews(storage, projectId, horizon);
    },

    async linkMission(
      input: LinkMissionInput,
    ): Promise<{ schema_version: 1; linked: boolean; goalId: string }> {
      const view = await getGoalView(storage, input.goalId);
      if (!view) {
        return {
          schema_version: 1 as const,
          linked: false,
          goalId: input.goalId,
        };
      }
      const nowIso = (input.now ?? new Date()).toISOString();
      const links = view.kpi.missionLinks.filter(
        (l) => l.missionId !== input.missionId,
      );
      links.push({
        missionId: input.missionId,
        title: input.title,
        linkedAt: nowIso,
      });
      const kpi = goalKpiDataSchema.parse({
        ...view.kpi,
        missionLinks: links,
      });
      await storage.goals.update(input.goalId, {
        kpiJson: serializeKpiData(kpi),
      });
      return {
        schema_version: 1 as const,
        linked: true,
        goalId: input.goalId,
      };
    },

    async unlinkMission(
      goalId: string,
      missionId: string,
    ): Promise<{ schema_version: 1; unlinked: boolean }> {
      const view = await getGoalView(storage, goalId);
      if (!view) {
        return { schema_version: 1 as const, unlinked: false };
      }
      const links = view.kpi.missionLinks.filter(
        (l) => l.missionId !== missionId,
      );
      const kpi = goalKpiDataSchema.parse({
        ...view.kpi,
        missionLinks: links,
      });
      await storage.goals.update(goalId, {
        kpiJson: serializeKpiData(kpi),
      });
      return { schema_version: 1 as const, unlinked: true };
    },

    async getGoalChain(goalId: string): Promise<GoalChain | null> {
      const goal = await getGoalView(storage, goalId);
      if (!goal) return null;
      return {
        schema_version: 1 as const,
        kind: "meta.goal_chain" as const,
        goal,
        kpis: goal.kpi.kpis,
        missionLinks: goal.kpi.missionLinks,
      };
    },
  };
}

export type GoalManager = ReturnType<typeof createGoalManager>;
