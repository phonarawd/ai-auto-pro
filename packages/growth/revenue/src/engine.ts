import { prioritizeCandidates, estimateCandidate } from "./prioritizer.js";
import type {
  RevenueCandidate,
  RevenueEstimate,
  RevenuePrioritizerResult,
} from "./schemas.js";

export type RevenueEngine = {
  estimateRevenue(input: {
    projectId: string;
    candidates: RevenueCandidate[];
  }): {
    schema_version: 1;
    estimates: RevenueEstimate[];
    isEstimate: true;
    estimateLabel: "추정";
  };
  prioritizeRevenue(input: {
    projectId: string;
    candidates: RevenueCandidate[];
  }): RevenuePrioritizerResult;
};

export function createRevenueEngine(): RevenueEngine {
  return {
    estimateRevenue(input) {
      const estimates = input.candidates.map((c) => estimateCandidate(c));
      return {
        schema_version: 1 as const,
        estimates,
        isEstimate: true as const,
        estimateLabel: "추정" as const,
      };
    },
    prioritizeRevenue(input) {
      return prioritizeCandidates(input.projectId, input.candidates);
    },
  };
}
