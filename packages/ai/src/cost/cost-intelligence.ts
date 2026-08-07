import type {
  AiAdapterRegistration,
  CostIntelligence,
  CostProposal,
} from "../types.js";
import type { BudgetClass, QualityTier, TaskClass } from "../schemas.js";

export type CreateCostIntelligenceOptions = {
  registrations: AiAdapterRegistration[];
  /** When set, checkBudget fails once estimated cost would exceed this. */
  budgetLimitUnits?: number;
};

export function createCostIntelligence(
  options: CreateCostIntelligenceOptions,
): CostIntelligence {
  const byId = new Map(
    options.registrations.map((r) => [r.adapter.id, r] as const),
  );
  let spentUnits = 0;

  return {
    propose(input: {
      taskClass: TaskClass;
      budgetClass: BudgetClass;
      qualityTier: QualityTier;
      candidateAdapterIds: string[];
    }): CostProposal {
      void input.taskClass;
      void input.qualityTier;

      const candidates = input.candidateAdapterIds
        .map((id) => byId.get(id))
        .filter((r): r is AiAdapterRegistration => r != null)
        .filter((r) => r.adapter.capabilities.chat);

      if (candidates.length === 0) {
        const fallbackId = input.candidateAdapterIds[0] ?? "unknown";
        return {
          schema_version: 1,
          adapterId: fallbackId,
          model: "unknown",
          estimatedCostUnits: 0,
          budgetClass: input.budgetClass,
        };
      }

      let pool = candidates;
      if (input.budgetClass === "free_local") {
        const local = candidates.filter(
          (r) =>
            r.apiKeyRef == null ||
            r.budgetClasses.includes("free_local") ||
            r.adapter.vendor === "ollama",
        );
        if (local.length > 0) pool = local;
      } else {
        const matching = candidates.filter((r) =>
          r.budgetClasses.includes(input.budgetClass),
        );
        if (matching.length > 0) pool = matching;
      }

      pool = [...pool].sort(
        (a, b) => a.costUnitsPer1kTokens - b.costUnitsPer1kTokens,
      );
      const chosen = pool[0]!;
      return {
        schema_version: 1,
        adapterId: chosen.adapter.id,
        model: chosen.adapter.defaultModel,
        estimatedCostUnits: Math.max(1, chosen.costUnitsPer1kTokens),
        budgetClass: input.budgetClass,
      };
    },

    checkBudget(input: {
      projectId?: string;
      estimatedCostUnits: number;
    }): { ok: true } | { ok: false; code: "AI_BUDGET_EXHAUSTED" } {
      void input.projectId;
      if (
        options.budgetLimitUnits != null &&
        spentUnits + input.estimatedCostUnits > options.budgetLimitUnits
      ) {
        return { ok: false, code: "AI_BUDGET_EXHAUSTED" };
      }
      return { ok: true };
    },

    recordUsage(input: {
      adapterId: string;
      costUnits: number;
      traceId: string;
    }): void {
      void input.adapterId;
      void input.traceId;
      spentUnits += input.costUnits;
    },
  };
}
