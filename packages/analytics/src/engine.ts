import { withSchemaVersion } from "@clime/shared";
import type { AnalyticsStorage } from "./persist.js";
import { listExperiments, upsertExperiment } from "./persist.js";
import type {
  CreateExperimentResult,
  ExperimentArm,
  ExperimentDoc,
} from "./schemas.js";

export type CreateExperimentInput = {
  projectId: string;
  name: string;
  arms?: ExperimentArm[];
  /** Requested paid spend. >0 requires HumanGate. Auto-applied spend is always 0. */
  spend?: number;
  humanApproved?: boolean;
  traceId?: string;
  now?: Date;
};

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function defaultArms(name: string): ExperimentArm[] {
  return [
    {
      id: "arm_control",
      label: `${name} control`,
      variantKind: "control",
    },
    {
      id: "arm_title_b",
      label: `${name} title B`,
      variantKind: "title",
    },
  ];
}

/**
 * Analytics Experiment Engine (V1 A/B skeleton).
 * - Organic (spend 0/undefined): create freely
 * - Spend-like (spend > 0): HumanGate required; autoSpendApplied always 0
 * - Must not emit Planner Queue / daily Decision mix
 */
export function createAnalyticsEngine(storage: AnalyticsStorage) {
  return {
    async createExperiment(input: CreateExperimentInput): Promise<CreateExperimentResult> {
      const spendRequested =
        typeof input.spend === "number" && Number.isFinite(input.spend)
          ? Math.max(0, input.spend)
          : null;
      const humanGateRequired = (spendRequested ?? 0) > 0;
      const humanApproved = input.humanApproved === true;
      const nowIso = (input.now ?? new Date()).toISOString();

      if (humanGateRequired && !humanApproved) {
        return withSchemaVersion({
          kind: "analytics.create_experiment_result" as const,
          ok: false,
          humanGateRequired: true,
          autoSpendApplied: 0 as const,
          spendRequested,
          terminal: "BLOCKED_HUMAN" as const,
          message:
            "Paid spend-like experiment requires HumanGate approval; auto spend is 0",
          traceId: input.traceId,
        });
      }

      const id = newId("exp");
      const arms =
        input.arms && input.arms.length > 0
          ? input.arms
          : defaultArms(input.name);

      const doc: ExperimentDoc = withSchemaVersion({
        kind: "analytics.experiment" as const,
        id,
        projectId: input.projectId,
        name: input.name,
        status: humanGateRequired ? ("draft" as const) : ("running" as const),
        arms,
        spendRequested,
        autoSpendApplied: 0 as const,
        humanGateRequired,
        humanApproved: humanGateRequired ? humanApproved : false,
        createdAt: nowIso,
        updatedAt: nowIso,
        traceId: input.traceId,
      });

      await upsertExperiment(storage, doc);

      return withSchemaVersion({
        kind: "analytics.create_experiment_result" as const,
        ok: true,
        experimentId: id,
        experiment: doc,
        humanGateRequired,
        autoSpendApplied: 0 as const,
        spendRequested,
        message: humanGateRequired
          ? "Experiment created under HumanGate; autoSpendApplied=0 (seat reserved)"
          : "Organic A/B experiment created",
        traceId: input.traceId,
      });
    },

    async listExperiments(projectId: string): Promise<ExperimentDoc[]> {
      return listExperiments(storage, projectId);
    },
  };
}

export type AnalyticsEngine = ReturnType<typeof createAnalyticsEngine>;
