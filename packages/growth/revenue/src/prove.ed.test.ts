import { describe, expect, it } from "vitest";
import { createRevenueEngine } from "./engine.js";
import {
  ESTIMATE_LABEL,
  revenueEstimateSchema,
  revenuePrioritizerResultSchema,
} from "./schemas.js";

describe("E-D Revenue Prove (추정 라벨)", () => {
  it("every estimate + prioritizer output carries isEstimate + 추정", () => {
    const engine = createRevenueEngine();
    const estimates = engine.estimateRevenue({
      projectId: "p",
      candidates: [
        { candidateId: "a", title: "A", formatHint: "shorts", climeFit: 0.7 },
        { candidateId: "b", title: "B", formatHint: "blog", unifiedScore: 0.6 },
      ],
    });
    expect(estimates.isEstimate).toBe(true);
    expect(estimates.estimateLabel).toBe(ESTIMATE_LABEL);
    for (const est of estimates.estimates) {
      const parsed = revenueEstimateSchema.parse(est);
      expect(parsed.isEstimate).toBe(true);
      expect(parsed.estimateLabel).toBe("추정");
    }

    const ranked = engine.prioritizeRevenue({
      projectId: "p",
      candidates: [
        { candidateId: "a", title: "A", formatHint: "shorts", climeFit: 0.7 },
      ],
    });
    const parsed = revenuePrioritizerResultSchema.parse(ranked);
    expect(parsed.isEstimate).toBe(true);
    expect(parsed.estimateLabel).toBe("추정");
    expect(parsed.ranked[0]?.estimate.estimateLabel).toBe("추정");
  });
});
