import type { MemoryEngine } from "@clime/memory";
import type { LearningEngine } from "./engine.js";
import type { RoiSnapshot } from "./schemas.js";

type ArgRecord = Record<string, unknown>;

type DomainHandler = (
  args: ArgRecord,
  context: {
    requestId: string;
    traceId: string;
    projectId?: string | null;
  },
) => Promise<unknown>;

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

/**
 * LearningAPI handlers — RFC 11 / S3A / IA.
 * Reflection + ROI→Policy; Confidence gate enforced in engine.
 */
export function createLearningDomainHandlers(
  engine: LearningEngine,
  memory: MemoryEngine,
  options?: { defaultProjectId?: string },
): Record<string, DomainHandler> {
  const defaultProjectId = options?.defaultProjectId;

  return {
    "learning.listPolicies": async (args, ctx) => {
      const projectId = asString(
        args.projectId,
        ctx.projectId ?? defaultProjectId ?? "",
      );
      if (!projectId) return [];
      const rows = await engine.listPolicies(projectId);
      return rows.map((r) => ({
        ...r.doc,
        confidence: r.confidence,
        status: r.status,
      }));
    },

    "learning.getPolicy": async (args) => {
      const policyId = asString(args.policyId);
      if (!policyId) {
        return { schema_version: 1, policyId: "stub", policy: null };
      }
      const row = await engine.getPolicy(policyId);
      if (!row) {
        return { schema_version: 1, policyId, policy: null };
      }
      return {
        schema_version: 1 as const,
        policyId,
        policy: {
          ...row.doc,
          confidence: row.confidence,
          status: row.status,
        },
      };
    },

    "learning.acceptProposal": async (args) => {
      const proposalId = asString(args.proposalId) || asString(args.policyId);
      if (!proposalId) {
        return { schema_version: 1, accepted: false };
      }
      return engine.acceptProposal(proposalId);
    },

    "learning.rejectProposal": async (args) => {
      const proposalId = asString(args.proposalId) || asString(args.policyId);
      if (!proposalId) {
        return { schema_version: 1, rejected: false };
      }
      return engine.rejectProposal(proposalId);
    },

    "learning.getConfidence": async (args, ctx) => {
      const projectId = asString(
        args.projectId,
        ctx.projectId ?? defaultProjectId ?? "",
      );
      if (!projectId) {
        return {
          schema_version: 1,
          score: 0,
          threshold: engine.threshold,
          suggestedCount: 0,
          activeCount: 0,
          rejectedCount: 0,
        };
      }
      return engine.getConfidence(projectId);
    },

    "learning.listReflections": async (args, ctx) => {
      const projectId = asString(
        args.projectId,
        ctx.projectId ?? defaultProjectId ?? "",
      );
      if (!projectId) return [];
      return engine.listReflections(projectId);
    },

    "learning.proposeFromRoi": async (args, ctx) => {
      const projectId = asString(
        args.projectId,
        ctx.projectId ?? defaultProjectId ?? "",
      );
      if (!projectId) {
        return {
          schema_version: 1,
          kind: "learning.propose_from_roi_result",
          ok: false,
          autoPromoted: false,
          threshold: engine.threshold,
          message: "projectId required",
        };
      }
      const isEstimate = asBoolean(args.isEstimate, false);
      const snapshot: RoiSnapshot = {
        schema_version: 1,
        kind: "learning.roi_snapshot",
        id: asString(args.id) || `roi_${Date.now().toString(36)}`,
        projectId,
        measuredRoi: asNumber(args.measuredRoi),
        baselineRoi:
          typeof args.baselineRoi === "number" ? args.baselineRoi : undefined,
        formatHint: asString(args.formatHint) || undefined,
        channelHint: asString(args.channelHint) || undefined,
        sampleSize:
          typeof args.sampleSize === "number" ? args.sampleSize : undefined,
        isEstimate,
        estimateLabel: isEstimate ? "추정" : undefined,
        confidence: asNumber(args.confidence),
        summary: asString(args.summary, "ROI measurement"),
        measuredAt: asString(args.measuredAt) || new Date().toISOString(),
        traceId: ctx.traceId,
      };
      return engine.proposeFromRoi({ snapshot, memory });
    },

    "learning.runReflection": async (args, ctx) => {
      const projectId = asString(
        args.projectId,
        ctx.projectId ?? defaultProjectId ?? "",
      );
      const title = asString(args.title).trim();
      const postmortem = asString(args.postmortem).trim();
      if (!projectId || !title || !postmortem) {
        return {
          schema_version: 1,
          ok: false,
          message: "projectId, title, postmortem required",
        };
      }
      return engine.runReflection({
        projectId,
        title,
        postmortem,
        confidence: asNumber(args.confidence),
        recommendation: asString(args.recommendation) || undefined,
        traceId: ctx.traceId,
      });
    },
  };
}
