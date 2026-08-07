import { enqueueFromDecision } from "@clime/growth-planning";
import {
  createRevenueEngine,
  type RevenueCandidate,
  type RevenueEngine,
} from "@clime/growth-revenue";
import type { ClimeStorage } from "@clime/storage";
import { buildDecisionGraph } from "./graph.js";
import { ESTIMATE_LABEL, type DecisionGraph } from "./schemas.js";

export type DecisionStorage = Pick<
  ClimeStorage,
  "missions" | "decisions" | "plannerQueue"
>;

export type RunDailyDecisionInput = {
  projectId: string;
  missionDate?: string;
  candidates?: RevenueCandidate[];
  missionTitle?: string;
  trendLabel?: string;
  keywordLabel?: string;
  horizonHint?: string;
  traceId: string;
};

export type RunDailyDecisionResult = {
  schema_version: 1;
  decisionId: string;
  missionId: string;
  queueItemIds: string[];
  narrative: string;
  productionMix: DecisionGraph["productionMix"];
  estimateLabel: "추정";
  graph: DecisionGraph;
};

export type MissionTodayView = {
  schema_version: 1;
  missions: Array<{
    id: string;
    title: string;
    description?: string;
    summary?: string;
    status: string;
    priority: number;
    decisionId?: string | null;
  }>;
  decisionExplain?: string;
  decisionId?: string | null;
  queueDepth: number;
  estimateLabel?: "추정";
  productionMix?: Record<string, number>;
};

export type DecisionEngine = {
  runDailyDecision(input: RunDailyDecisionInput): Promise<RunDailyDecisionResult>;
  getMissionToday(input: {
    projectId: string;
    missionDate?: string;
  }): Promise<MissionTodayView>;
  getDecision(input: {
    projectId: string;
    decisionId?: string;
  }): Promise<{
    schema_version: 1;
    decision: null | {
      id: string;
      projectId: string;
      decidedAt: string;
      missionId: string | null;
      narrative: string | null;
      graph: DecisionGraph | null;
    };
  }>;
  explainDecision(input: {
    projectId: string;
    decisionId?: string;
  }): Promise<{
    schema_version: 1;
    explanation: string;
    estimateLabel?: "추정";
    graph?: DecisionGraph | null;
  }>;
  listPlannerQueue(input: {
    projectId: string;
    limit?: number;
  }): Promise<unknown[]>;
};

function todayDate(iso = new Date()): string {
  return iso.toISOString().slice(0, 10);
}

function defaultCandidates(): RevenueCandidate[] {
  return [
    {
      candidateId: "cand_shorts",
      title: "AI 트렌드 숏폼 멀티잭",
      formatHint: "shorts",
      climeFit: 0.85,
      unifiedScore: 0.8,
    },
    {
      candidateId: "cand_threads",
      title: "키워드 스레드 시리즈",
      formatHint: "threads",
      climeFit: 0.7,
      unifiedScore: 0.65,
    },
    {
      candidateId: "cand_blog",
      title: "심층 블로그 가이드",
      formatHint: "blog",
      climeFit: 0.55,
      unifiedScore: 0.5,
    },
  ];
}

function mixFromTopFormat(formatHint?: string): DecisionGraph["productionMix"] {
  const f = (formatHint ?? "shorts").toLowerCase();
  if (f.includes("blog")) return { blogs: 1, shorts: 1, threads: 1 };
  if (f.includes("thread")) return { threads: 2, shorts: 1 };
  if (f.includes("reel")) return { reels: 2, shorts: 1 };
  return { shorts: 2, threads: 1, blogs: 0 };
}

function parseGraph(graphJson: string): DecisionGraph | null {
  try {
    const raw = JSON.parse(graphJson) as DecisionGraph;
    if (raw?.kind === "growth.decision_graph" && raw.schema_version === 1) {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

async function enrichGraphWithQueue(
  storage: DecisionStorage,
  projectId: string,
  graph: DecisionGraph,
  decisionId: string,
  missionId: string | null,
): Promise<DecisionGraph> {
  const queue = await storage.plannerQueue.listByProject(projectId, 100);
  const linked = queue.filter((q) => q.decisionId === decisionId);
  if (linked.length === 0) {
    return { ...graph, decisionId };
  }
  return buildDecisionGraph({
    decisionId,
    decidedAt: graph.decidedAt,
    missionId:
      missionId ??
      graph.nodes
        .find((n) => n.type === "Mission")
        ?.id.replace("node_mission_", "") ??
      "mission",
    missionTitle:
      graph.nodes.find((n) => n.type === "Mission")?.label ?? "Mission",
    topEstimateId:
      graph.nodes
        .find((n) => n.type === "RevenueEstimate")
        ?.id.replace("node_est_", "") ?? "est",
    topEstimateTitle:
      graph.nodes
        .find((n) => n.type === "RevenueEstimate")
        ?.label.replace(` (${ESTIMATE_LABEL})`, "") ?? "Estimate",
    trendLabel: graph.nodes.find((n) => n.type === "Trend")?.label,
    keywordLabel: graph.nodes.find((n) => n.type === "Keyword")?.label,
    queueItemIds: linked.map((q) => q.id),
    productionMix: graph.productionMix,
    narrative: graph.narrative,
  });
}

/**
 * Decision Engine — sole daily priority emitter (EA §0 / §3).
 * Enqueues via planning producer only — Workers 직행 0.
 */
export function createDecisionEngine(
  storage: DecisionStorage,
  options?: { revenue?: RevenueEngine },
): DecisionEngine {
  const revenue = options?.revenue ?? createRevenueEngine();

  return {
    async runDailyDecision(input) {
      const missionDate = input.missionDate ?? todayDate();
      const candidates =
        input.candidates && input.candidates.length > 0
          ? input.candidates
          : defaultCandidates();

      const prioritized = revenue.prioritizeRevenue({
        projectId: input.projectId,
        candidates,
      });
      const top = prioritized.ranked[0];
      if (!top) {
        throw new Error("prioritizeRevenue returned empty ranking");
      }

      const decidedAt = new Date().toISOString();
      const productionMix = mixFromTopFormat(
        candidates.find((c) => c.candidateId === top.candidateId)?.formatHint,
      );
      const missionTitle =
        input.missionTitle ?? `${top.estimate.title} — 오늘 우선 미션`;
      const narrative = [
        `Why Today: ${top.estimate.title}이(가) CLIME 경로(콘텐츠→가입→투자→수익)에서 최고 ${ESTIMATE_LABEL} ROI(${top.estimate.expectedRoi})입니다.`,
        input.horizonHint
          ? `Horizon hint (non-binding): ${input.horizonHint}`
          : null,
        `Production mix: ${JSON.stringify(productionMix)}.`,
        `Decision Engine sole daily arbiter — Executive does not rank today.`,
      ]
        .filter(Boolean)
        .join(" ");

      const missionPayload = {
        schema_version: 1 as const,
        kind: "growth.mission_payload",
        description: top.estimate.title,
        summary: narrative,
        productionMix,
        topCandidateId: top.candidateId,
        estimateLabel: ESTIMATE_LABEL,
        expectedRoi: top.estimate.expectedRoi,
        isEstimate: true as const,
        traceId: input.traceId,
      };

      const { id: missionId } = await storage.missions.create({
        projectId: input.projectId,
        missionDate,
        title: missionTitle,
        status: "READY",
        priority: 1,
        decisionId: null,
        payloadJson: JSON.stringify(missionPayload),
      });

      // decisionId inside graph is patched to row.id on read (DecisionRepository has no update).
      const graphSeed = buildDecisionGraph({
        decisionId: "pending",
        decidedAt,
        missionId,
        missionTitle,
        topEstimateId: top.estimate.id,
        topEstimateTitle: top.estimate.title,
        trendLabel: input.trendLabel,
        keywordLabel: input.keywordLabel,
        queueItemIds: [],
        productionMix,
        narrative,
      });

      const { id: decisionId } = await storage.decisions.create({
        projectId: input.projectId,
        decidedAt,
        missionId,
        graphJson: JSON.stringify(graphSeed),
        narrative,
      });

      await storage.missions.update(missionId, { decisionId });

      const { queueItemIds } = await enqueueFromDecision(storage, {
        projectId: input.projectId,
        decisionId,
        missionId,
        items: [
          {
            priority: 1,
            expectedRoi: top.estimate.expectedRoi,
            payload: {
              schema_version: 1 as const,
              kind: "growth.decision_queue_work",
              candidateId: top.candidateId,
              title: top.estimate.title,
              estimateLabel: ESTIMATE_LABEL,
              isEstimate: true as const,
              productionMix,
              traceId: input.traceId,
            },
          },
        ],
      });

      const graph = buildDecisionGraph({
        decisionId,
        decidedAt,
        missionId,
        missionTitle,
        topEstimateId: top.estimate.id,
        topEstimateTitle: top.estimate.title,
        trendLabel: input.trendLabel,
        keywordLabel: input.keywordLabel,
        queueItemIds,
        productionMix,
        narrative,
      });

      return {
        schema_version: 1 as const,
        decisionId,
        missionId,
        queueItemIds,
        narrative,
        productionMix,
        estimateLabel: ESTIMATE_LABEL,
        graph,
      };
    },

    async getMissionToday(input) {
      const missionDate = input.missionDate ?? todayDate();
      const missions = await storage.missions.listByDate(
        input.projectId,
        missionDate,
      );
      const latest = await storage.decisions.latestForProject(input.projectId);
      const queue = await storage.plannerQueue.listByProject(input.projectId, 100);
      const graph = latest ? parseGraph(latest.graphJson) : null;
      const productionMix = graph?.productionMix as
        | Record<string, number>
        | undefined;

      return {
        schema_version: 1 as const,
        missions: missions
          .slice()
          .sort((a, b) => a.priority - b.priority)
          .map((m) => {
            let description: string | undefined;
            let summary: string | undefined;
            try {
              const payload = JSON.parse(m.payloadJson) as {
                description?: string;
                summary?: string;
              };
              description = payload.description;
              summary = payload.summary;
            } catch {
              /* ignore */
            }
            return {
              id: m.id,
              title: m.title,
              description,
              summary: summary ?? latest?.narrative ?? undefined,
              status: m.status,
              priority: m.priority,
              decisionId: m.decisionId,
            };
          }),
        decisionExplain: latest?.narrative ?? graph?.narrative,
        decisionId: latest?.id ?? null,
        queueDepth: queue.length,
        estimateLabel: latest ? ESTIMATE_LABEL : undefined,
        productionMix,
      };
    },

    async getDecision(input) {
      const row = input.decisionId
        ? await storage.decisions.getById(input.decisionId)
        : await storage.decisions.latestForProject(input.projectId);
      if (!row || row.projectId !== input.projectId) {
        return { schema_version: 1 as const, decision: null };
      }
      const parsed = parseGraph(row.graphJson);
      const graph = parsed
        ? await enrichGraphWithQueue(
            storage,
            input.projectId,
            parsed,
            row.id,
            row.missionId,
          )
        : null;
      return {
        schema_version: 1 as const,
        decision: {
          id: row.id,
          projectId: row.projectId,
          decidedAt: row.decidedAt,
          missionId: row.missionId,
          narrative: row.narrative,
          graph,
        },
      };
    },

    async explainDecision(input) {
      const { decision } = await this.getDecision(input);
      if (!decision) {
        return {
          schema_version: 1 as const,
          explanation: "No daily decision yet. Run growth.runDailyDecision.",
        };
      }
      return {
        schema_version: 1 as const,
        explanation:
          decision.narrative ?? decision.graph?.narrative ?? "Decision recorded",
        estimateLabel: ESTIMATE_LABEL,
        graph: decision.graph,
      };
    },

    async listPlannerQueue(input) {
      const rows = await storage.plannerQueue.listByProject(
        input.projectId,
        input.limit ?? 50,
      );
      return rows.map((r) => ({
        schema_version: 1,
        id: r.id,
        projectId: r.projectId,
        priority: r.priority,
        status: r.status,
        decisionId: r.decisionId,
        missionId: r.missionId,
        expectedRoi: r.expectedRoi,
        estimateLabel: ESTIMATE_LABEL,
      }));
    },
  };
}
