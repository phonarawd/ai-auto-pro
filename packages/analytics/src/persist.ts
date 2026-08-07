import { withSchemaVersion } from "@clime/shared";
import type { ClimeStorage } from "@clime/storage";
import {
  ANALYTICS_KNOWLEDGE,
  experimentDocSchema,
  type ExperimentDoc,
} from "./schemas.js";

export type AnalyticsStorage = Pick<ClimeStorage, "knowledge">;

type StoredEnvelope = {
  schema_version: 1;
  data?: {
    key?: string;
    payload?: unknown;
  };
};

function toBody(key: string, payload: Record<string, unknown>): string {
  return JSON.stringify(
    withSchemaVersion({
      data: { key, payload },
    }),
  );
}

export async function upsertExperiment(
  storage: AnalyticsStorage,
  doc: ExperimentDoc,
): Promise<void> {
  const parsed = experimentDocSchema.parse(doc);
  const existing = await storage.knowledge.list(parsed.projectId, {
    namespace: ANALYTICS_KNOWLEDGE.namespace,
    type: ANALYTICS_KNOWLEDGE.experimentType,
  });
  const match = existing.find((row) => {
    try {
      const envelope = JSON.parse(row.body ?? "{}") as StoredEnvelope;
      return envelope.data?.key === parsed.id;
    } catch {
      return false;
    }
  });
  await storage.knowledge.upsert({
    id: match?.id,
    projectId: parsed.projectId,
    namespace: ANALYTICS_KNOWLEDGE.namespace,
    type: ANALYTICS_KNOWLEDGE.experimentType,
    tagsJson: JSON.stringify(
      withSchemaVersion({ tags: [ANALYTICS_KNOWLEDGE.experimentType, parsed.status] }),
    ),
    body: toBody(parsed.id, parsed),
    blobRef: null,
    evolutionJson: null,
  });
}

export async function listExperiments(
  storage: AnalyticsStorage,
  projectId: string,
): Promise<ExperimentDoc[]> {
  const rows = await storage.knowledge.list(projectId, {
    namespace: ANALYTICS_KNOWLEDGE.namespace,
    type: ANALYTICS_KNOWLEDGE.experimentType,
  });
  const out: ExperimentDoc[] = [];
  for (const row of rows) {
    if (!row.body) continue;
    try {
      const envelope = JSON.parse(row.body) as StoredEnvelope;
      const payload = envelope.data?.payload;
      const parsed = experimentDocSchema.safeParse(payload);
      if (parsed.success) out.push(parsed.data);
    } catch {
      // skip corrupt
    }
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getExperiment(
  storage: AnalyticsStorage,
  projectId: string,
  experimentId: string,
): Promise<ExperimentDoc | null> {
  const all = await listExperiments(storage, projectId);
  return all.find((e) => e.id === experimentId) ?? null;
}
