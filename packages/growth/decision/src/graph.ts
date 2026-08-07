import { ESTIMATE_LABEL, type DecisionGraph } from "./schemas.js";

export type GraphBuildInput = {
  decisionId: string;
  decidedAt: string;
  missionId: string;
  missionTitle: string;
  topEstimateId: string;
  topEstimateTitle: string;
  trendLabel?: string;
  keywordLabel?: string;
  queueItemIds: string[];
  productionMix: DecisionGraph["productionMix"];
  narrative: string;
};

/**
 * Build Decision Graph Option A envelope — EA §3.2.
 * Trend → Keyword → RevenueEstimate → Decision → Mission → PlannerQueueItem
 */
export function buildDecisionGraph(input: GraphBuildInput): DecisionGraph {
  const trendId = "node_trend";
  const keywordId = "node_keyword";
  const estimateId = `node_est_${input.topEstimateId}`;
  const decisionNodeId = `node_decision_${input.decisionId}`;
  const missionNodeId = `node_mission_${input.missionId}`;

  const nodes: DecisionGraph["nodes"] = [
    {
      id: trendId,
      type: "Trend",
      label: input.trendLabel ?? "Today trends",
    },
    {
      id: keywordId,
      type: "Keyword",
      label: input.keywordLabel ?? "Primary keywords",
    },
    {
      id: estimateId,
      type: "RevenueEstimate",
      label: `${input.topEstimateTitle} (${ESTIMATE_LABEL})`,
    },
    {
      id: decisionNodeId,
      type: "Decision",
      label: "Daily Decision",
    },
    {
      id: missionNodeId,
      type: "Mission",
      label: input.missionTitle,
    },
  ];

  const edges: DecisionGraph["edges"] = [
    { from: trendId, to: keywordId, relation: "feeds" },
    { from: keywordId, to: estimateId, relation: "feeds" },
    { from: estimateId, to: decisionNodeId, relation: "ranks" },
    { from: decisionNodeId, to: missionNodeId, relation: "decides" },
  ];

  for (const qid of input.queueItemIds) {
    const qNodeId = `node_queue_${qid}`;
    nodes.push({
      id: qNodeId,
      type: "PlannerQueueItem",
      label: `Queue ${qid.slice(0, 8)}`,
    });
    edges.push({
      from: missionNodeId,
      to: qNodeId,
      relation: "enqueues",
    });
  }

  return {
    schema_version: 1 as const,
    kind: "growth.decision_graph" as const,
    decisionId: input.decisionId,
    decidedAt: input.decidedAt,
    productionMix: input.productionMix,
    nodes,
    edges,
    narrative: input.narrative,
    estimateLabel: ESTIMATE_LABEL,
  };
}
