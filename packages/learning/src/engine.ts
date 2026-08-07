import type { MemoryEngine } from "@clime/memory";
import { withSchemaVersion } from "@clime/shared";
import {
  CONFIDENCE_AUTO_PROMOTE_THRESHOLD,
  canAutoPromote,
  clampConfidence,
} from "./confidence.js";
import type { LearningStorage } from "./persist.js";
import {
  getPolicyRow,
  listPolicies,
  listReflections,
  putPolicy,
  upsertReflection,
  upsertStrategyPlaybook,
} from "./persist.js";
import type {
  LearningPolicyDoc,
  ProposeFromRoiResult,
  ReflectionDoc,
  RoiSnapshot,
} from "./schemas.js";
import { roiSnapshotSchema } from "./schemas.js";

export type ProposeFromRoiInput = {
  snapshot: RoiSnapshot;
  memory: MemoryEngine;
  now?: Date;
};

export type RunReflectionInput = {
  projectId: string;
  title: string;
  postmortem: string;
  confidence: number;
  recommendation?: string;
  traceId?: string;
  now?: Date;
};

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function writeStrategyPlaybook(
  storage: LearningStorage,
  policy: LearningPolicyDoc,
  confidence: number,
  nowIso: string,
): Promise<string> {
  const playbookId = policy.strategyPlaybookId ?? newId("playbook");
  await upsertStrategyPlaybook(storage, {
    schema_version: 1,
    kind: "knowledge.strategy_playbook",
    id: playbookId,
    projectId: policy.projectId,
    title: policy.title,
    body: policy.recommendation,
    sourcePolicyId: policy.id,
    confidence,
    createdAt: nowIso,
  });
  return playbookId;
}

/**
 * Learning Engine — policies + Confidence + Reflection (IA / RFC 11).
 * Meta does not own Reflection. Auto-promote only when confidence ≥ 0.91.
 */
export function createLearningEngine(storage: LearningStorage) {
  return {
    threshold: CONFIDENCE_AUTO_PROMOTE_THRESHOLD,

    async proposeFromRoi(
      input: ProposeFromRoiInput,
    ): Promise<ProposeFromRoiResult> {
      const snapshot = roiSnapshotSchema.parse(input.snapshot);
      if (snapshot.isEstimate && snapshot.estimateLabel !== "추정") {
        return withSchemaVersion({
          kind: "learning.propose_from_roi_result" as const,
          ok: false,
          autoPromoted: false,
          threshold: CONFIDENCE_AUTO_PROMOTE_THRESHOLD,
          message: 'Estimate ROI snapshots require estimateLabel: "추정"',
          traceId: snapshot.traceId,
        });
      }

      const confidence = clampConfidence(snapshot.confidence);
      const nowIso = (input.now ?? new Date()).toISOString();
      const policyId = newId("lpol");

      const episode = await input.memory.recordEpisode({
        projectId: snapshot.projectId,
        episodeKind: "roi",
        summary: snapshot.summary,
        facts: {
          measuredRoi: snapshot.measuredRoi,
          baselineRoi: snapshot.baselineRoi,
          formatHint: snapshot.formatHint,
          channelHint: snapshot.channelHint,
          sampleSize: snapshot.sampleSize,
          isEstimate: snapshot.isEstimate,
          roiSnapshotId: snapshot.id,
        },
        horizon: "short",
        occurredAt: snapshot.measuredAt,
        traceId: snapshot.traceId,
        now: input.now,
      });

      const auto = canAutoPromote(confidence);
      const recommendation =
        snapshot.formatHint != null
          ? `Allocate more to ${snapshot.formatHint} (measured ROI ${snapshot.measuredRoi})`
          : `Adjust mix from ROI signal ${snapshot.measuredRoi}`;

      let doc: LearningPolicyDoc = withSchemaVersion({
        kind: "learning.policy" as const,
        id: policyId,
        projectId: snapshot.projectId,
        title: `ROI policy: ${snapshot.summary}`,
        proposalSource: "roi" as const,
        recommendation,
        proposedRule: {
          scope: "project" as const,
          scopeId: snapshot.projectId,
          ruleHint: {
            kind: "roi_reallocation",
            formatHint: snapshot.formatHint,
            measuredRoi: snapshot.measuredRoi,
          },
        },
        roiSnapshotId: snapshot.id,
        createdAt: nowIso,
        updatedAt: nowIso,
        traceId: snapshot.traceId,
      });

      let strategyPlaybookId: string | undefined;
      if (auto) {
        strategyPlaybookId = await writeStrategyPlaybook(
          storage,
          doc,
          confidence,
          nowIso,
        );
        doc = {
          ...doc,
          strategyPlaybookId,
          updatedAt: nowIso,
        };
      }

      await putPolicy(storage, doc, confidence, auto ? "active" : "suggested");

      return withSchemaVersion({
        kind: "learning.propose_from_roi_result" as const,
        ok: true,
        policyId,
        status: auto ? ("active" as const) : ("suggested" as const),
        autoPromoted: auto,
        episodeId: episode.id,
        strategyPlaybookId,
        confidence,
        threshold: CONFIDENCE_AUTO_PROMOTE_THRESHOLD,
        message: auto
          ? "Auto-promoted — confidence ≥ threshold"
          : "Suggested only — confidence below threshold",
        traceId: snapshot.traceId,
      });
    },

    async runReflection(input: RunReflectionInput): Promise<{
      schema_version: 1;
      reflection: ReflectionDoc;
      policyId: string;
      status: "suggested" | "active";
      autoPromoted: boolean;
      strategyPlaybookId?: string;
    }> {
      const confidence = clampConfidence(input.confidence);
      const nowIso = (input.now ?? new Date()).toISOString();
      const reflectionId = newId("refl");
      const policyId = newId("lpol");
      const auto = canAutoPromote(confidence);
      const recommendation =
        input.recommendation?.trim() ||
        `Reflection: ${input.title} — apply postmortem lessons`;

      let doc: LearningPolicyDoc = withSchemaVersion({
        kind: "learning.policy" as const,
        id: policyId,
        projectId: input.projectId,
        title: input.title,
        proposalSource: "reflection" as const,
        recommendation,
        reflectionId,
        createdAt: nowIso,
        updatedAt: nowIso,
        traceId: input.traceId,
      });

      let strategyPlaybookId: string | undefined;
      if (auto) {
        strategyPlaybookId = await writeStrategyPlaybook(
          storage,
          doc,
          confidence,
          nowIso,
        );
        doc = { ...doc, strategyPlaybookId, updatedAt: nowIso };
      }

      await putPolicy(storage, doc, confidence, auto ? "active" : "suggested");

      const reflection = withSchemaVersion({
        kind: "learning.reflection" as const,
        id: reflectionId,
        projectId: input.projectId,
        title: input.title,
        postmortem: input.postmortem,
        confidence,
        proposalId: policyId,
        createdAt: nowIso,
        traceId: input.traceId,
      });
      await upsertReflection(storage, reflection);

      return {
        schema_version: 1,
        reflection,
        policyId,
        status: auto ? "active" : "suggested",
        autoPromoted: auto,
        strategyPlaybookId,
      };
    },

    async listPolicies(projectId: string) {
      return listPolicies(storage, projectId);
    },

    async getPolicy(policyId: string) {
      return getPolicyRow(storage, policyId);
    },

    async acceptProposal(policyId: string): Promise<{
      schema_version: 1;
      accepted: boolean;
      status?: "active";
      strategyPlaybookId?: string;
      message?: string;
    }> {
      const row = await getPolicyRow(storage, policyId);
      if (!row) {
        return {
          schema_version: 1,
          accepted: false,
          message: "policy not found",
        };
      }
      if (row.status === "rejected") {
        return {
          schema_version: 1,
          accepted: false,
          message: "rejected policies cannot be accepted",
        };
      }
      const nowIso = new Date().toISOString();
      const playbookId = await writeStrategyPlaybook(
        storage,
        row.doc,
        row.confidence,
        nowIso,
      );
      const doc: LearningPolicyDoc = {
        ...row.doc,
        strategyPlaybookId: playbookId,
        updatedAt: nowIso,
      };
      await putPolicy(storage, doc, row.confidence, "active");
      return {
        schema_version: 1,
        accepted: true,
        status: "active",
        strategyPlaybookId: playbookId,
      };
    },

    async rejectProposal(policyId: string): Promise<{
      schema_version: 1;
      rejected: boolean;
      message?: string;
    }> {
      const row = await getPolicyRow(storage, policyId);
      if (!row) {
        return {
          schema_version: 1,
          rejected: false,
          message: "policy not found",
        };
      }
      const nowIso = new Date().toISOString();
      await putPolicy(
        storage,
        { ...row.doc, updatedAt: nowIso },
        row.confidence,
        "rejected",
      );
      return { schema_version: 1, rejected: true };
    },

    async getConfidence(projectId: string): Promise<{
      schema_version: 1;
      score: number;
      threshold: number;
      suggestedCount: number;
      activeCount: number;
      rejectedCount: number;
    }> {
      const policies = await listPolicies(storage, projectId);
      const suggestedCount = policies.filter((p) => p.status === "suggested").length;
      const activeCount = policies.filter((p) => p.status === "active").length;
      const rejectedCount = policies.filter((p) => p.status === "rejected").length;
      const avg =
        policies.length === 0
          ? 0
          : policies.reduce((s, p) => s + p.confidence, 0) / policies.length;
      return {
        schema_version: 1,
        score: avg,
        threshold: CONFIDENCE_AUTO_PROMOTE_THRESHOLD,
        suggestedCount,
        activeCount,
        rejectedCount,
      };
    },

    async listReflections(projectId: string) {
      return listReflections(storage, projectId);
    },
  };
}

export type LearningEngine = ReturnType<typeof createLearningEngine>;
