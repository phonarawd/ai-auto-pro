import { describe, expect, it } from "vitest";
import { createRevenueDomainHandlers } from "./api.js";
import { createRevenueEngine } from "./engine.js";
import { ESTIMATE_LABEL, revenueEstimateSchema, revenuePrioritizerResultSchema } from "./schemas.js";

describe("E-B Revenue Prioritizer", () => {
  it("estimateRevenue always labels 추정", () => {
    const engine = createRevenueEngine();
    const result = engine.estimateRevenue({
      projectId: "p1",
      candidates: [
        {
          candidateId: "c1",
          title: "AI Shorts hook",
          formatHint: "shorts",
          climeFit: 0.8,
          unifiedScore: 0.7,
        },
      ],
    });
    expect(result.isEstimate).toBe(true);
    expect(result.estimateLabel).toBe(ESTIMATE_LABEL);
    expect(result.estimates).toHaveLength(1);
    const est = revenueEstimateSchema.parse(result.estimates[0]);
    expect(est.isEstimate).toBe(true);
    expect(est.estimateLabel).toBe("추정");
    expect(est.kind).toBe("growth.revenue_estimate");
  });

  it("prioritizeRevenue ranks by money path not vanity", () => {
    const engine = createRevenueEngine();
    const result = engine.prioritizeRevenue({
      projectId: "p1",
      candidates: [
        {
          candidateId: "blog",
          title: "Long blog",
          formatHint: "blog",
          climeFit: 0.4,
          unifiedScore: 0.9,
        },
        {
          candidateId: "shorts",
          title: "Shorts",
          formatHint: "shorts",
          climeFit: 0.9,
          unifiedScore: 0.75,
        },
      ],
    });
    const parsed = revenuePrioritizerResultSchema.parse(result);
    expect(parsed.isEstimate).toBe(true);
    expect(parsed.estimateLabel).toBe("추정");
    expect(parsed.ranked[0]?.candidateId).toBe("shorts");
    expect(parsed.ranked.every((r) => r.estimate.estimateLabel === "추정")).toBe(
      true,
    );
  });

  it("domain handlers wire estimate + prioritize", async () => {
    const handlers = createRevenueDomainHandlers(createRevenueEngine(), {
      defaultProjectId: "proj",
    });
    const est = (await handlers["growth.estimateRevenue"]!(
      {
        candidates: [{ candidateId: "x", title: "X", formatHint: "threads" }],
      },
      { requestId: "r1", traceId: "t1" },
    )) as { estimateLabel: string; estimates: unknown[] };
    expect(est.estimateLabel).toBe("추정");
    expect(est.estimates.length).toBe(1);

    const pri = (await handlers["growth.prioritizeRevenue"]!(
      {
        candidates: [{ candidateId: "x", title: "X", climeFit: 0.6 }],
      },
      { requestId: "r2", traceId: "t2" },
    )) as { kind: string; ranked: unknown[] };
    expect(pri.kind).toBe("growth.revenue_prioritizer_result");
    expect(pri.ranked.length).toBe(1);
  });
});
