import { goalHorizonSchema, withSchemaVersion } from "@clime/shared";
import type { ClimeStorage, GoalRow } from "@clime/storage";
import {
  goalKpiDataSchema,
  goalStatusSchema,
  type GoalKpiData,
  type GoalStatus,
  type GoalView,
} from "./schemas.js";

export type MetaStorage = Pick<ClimeStorage, "goals" | "decisions">;

type StoredKpiEnvelope = {
  schema_version: 1;
  data?: Record<string, unknown>;
};

export function serializeKpiData(kpi: GoalKpiData): string {
  const parsed = goalKpiDataSchema.parse(kpi);
  return JSON.stringify(
    withSchemaVersion({
      data: parsed as unknown as Record<string, unknown>,
    }),
  );
}

export function parseKpiData(kpiJson: string): GoalKpiData {
  let raw: unknown;
  try {
    raw = JSON.parse(kpiJson) as unknown;
  } catch {
    return goalKpiDataSchema.parse({
      kind: "meta.goal_kpi",
      kpis: [],
      missionLinks: [],
    });
  }
  const envelope = raw as StoredKpiEnvelope;
  const data = envelope.data ?? {};
  const parsed = goalKpiDataSchema.safeParse({
    kind: "meta.goal_kpi",
    ...data,
    kpis: Array.isArray(data.kpis) ? data.kpis : [],
    missionLinks: Array.isArray(data.missionLinks) ? data.missionLinks : [],
  });
  if (parsed.success) return parsed.data;
  return goalKpiDataSchema.parse({
    kind: "meta.goal_kpi",
    kpis: [],
    missionLinks: [],
  });
}

export function rowToGoalView(row: GoalRow): GoalView {
  const horizon = goalHorizonSchema.parse(row.horizon);
  const status = goalStatusSchema.catch("active").parse(row.status);
  return {
    schema_version: 1,
    kind: "meta.goal",
    id: row.id,
    projectId: row.projectId,
    horizon,
    title: row.title,
    status: status as GoalStatus,
    kpi: parseKpiData(row.kpiJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listGoalViews(
  storage: MetaStorage,
  projectId: string,
  horizon?: "week" | "month" | "quarter",
): Promise<GoalView[]> {
  const rows = await storage.goals.list(projectId, horizon);
  return rows.map(rowToGoalView);
}

export async function getGoalView(
  storage: MetaStorage,
  goalId: string,
): Promise<GoalView | null> {
  const row = await storage.goals.getById(goalId);
  return row ? rowToGoalView(row) : null;
}
