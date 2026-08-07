import { withSchemaVersion } from "@clime/shared";
import type { ClimeStorage } from "@clime/storage";
import {
  LEARNING_KNOWLEDGE,
  learningPolicyDocSchema,
  reflectionDocSchema,
  strategyPlaybookSchema,
  type LearningPolicyDoc,
  type LearningPolicyStatus,
  type ReflectionDoc,
  type StrategyPlaybook,
} from "./schemas.js";

export type LearningStorage = Pick<ClimeStorage, "learning" | "knowledge">;

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

function parseKnowledgePayload<T>(
  body: string | null,
  schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } },
): T | null {
  if (!body) return null;
  try {
    const envelope = JSON.parse(body) as StoredEnvelope;
    const parsed = schema.safeParse(envelope.data?.payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function putPolicy(
  storage: LearningStorage,
  doc: LearningPolicyDoc,
  confidence: number,
  status: LearningPolicyStatus,
): Promise<{ id: string }> {
  const parsed = learningPolicyDocSchema.parse(doc);
  return storage.learning.put({
    id: parsed.id,
    projectId: parsed.projectId,
    policyJson: JSON.stringify(parsed),
    confidence,
    status,
  });
}

export async function getPolicyRow(
  storage: LearningStorage,
  policyId: string,
): Promise<{
  doc: LearningPolicyDoc;
  confidence: number;
  status: LearningPolicyStatus;
} | null> {
  const row = await storage.learning.getById(policyId);
  if (!row) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(row.policyJson) as unknown;
  } catch {
    return null;
  }
  const parsed = learningPolicyDocSchema.safeParse(raw);
  if (!parsed.success) return null;
  const okStatus =
    row.status === "suggested" ||
    row.status === "active" ||
    row.status === "rejected"
      ? row.status
      : "suggested";
  return {
    doc: parsed.data,
    confidence: row.confidence,
    status: okStatus,
  };
}

export async function listPolicies(
  storage: LearningStorage,
  projectId: string,
): Promise<
  Array<{
    doc: LearningPolicyDoc;
    confidence: number;
    status: LearningPolicyStatus;
  }>
> {
  const rows = await storage.learning.list(projectId);
  const out: Array<{
    doc: LearningPolicyDoc;
    confidence: number;
    status: LearningPolicyStatus;
  }> = [];
  for (const row of rows) {
    try {
      const parsed = learningPolicyDocSchema.safeParse(
        JSON.parse(row.policyJson) as unknown,
      );
      if (!parsed.success) continue;
      const status =
        row.status === "suggested" ||
        row.status === "active" ||
        row.status === "rejected"
          ? row.status
          : "suggested";
      out.push({
        doc: parsed.data,
        confidence: row.confidence,
        status,
      });
    } catch {
      // skip corrupt
    }
  }
  return out.sort((a, b) =>
    b.doc.updatedAt.localeCompare(a.doc.updatedAt),
  );
}

export async function upsertReflection(
  storage: LearningStorage,
  doc: ReflectionDoc,
): Promise<void> {
  const parsed = reflectionDocSchema.parse(doc);
  const existing = await storage.knowledge.list(parsed.projectId, {
    namespace: LEARNING_KNOWLEDGE.reflectionNamespace,
    type: LEARNING_KNOWLEDGE.reflectionType,
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
    namespace: LEARNING_KNOWLEDGE.reflectionNamespace,
    type: LEARNING_KNOWLEDGE.reflectionType,
    tagsJson: JSON.stringify(
      withSchemaVersion({ tags: ["reflection"] }),
    ),
    body: toBody(parsed.id, parsed),
    blobRef: null,
    evolutionJson: null,
  });
}

export async function listReflections(
  storage: LearningStorage,
  projectId: string,
): Promise<ReflectionDoc[]> {
  const rows = await storage.knowledge.list(projectId, {
    namespace: LEARNING_KNOWLEDGE.reflectionNamespace,
    type: LEARNING_KNOWLEDGE.reflectionType,
  });
  const out: ReflectionDoc[] = [];
  for (const row of rows) {
    const doc = parseKnowledgePayload(row.body, reflectionDocSchema);
    if (doc) out.push(doc);
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function upsertStrategyPlaybook(
  storage: LearningStorage,
  playbook: StrategyPlaybook,
): Promise<string> {
  const parsed = strategyPlaybookSchema.parse(playbook);
  const existing = await storage.knowledge.list(parsed.projectId, {
    namespace: LEARNING_KNOWLEDGE.strategyNamespace,
    type: LEARNING_KNOWLEDGE.playbookType,
  });
  const match = existing.find((row) => {
    try {
      const envelope = JSON.parse(row.body ?? "{}") as StoredEnvelope;
      return envelope.data?.key === parsed.id;
    } catch {
      return false;
    }
  });
  const { id } = await storage.knowledge.upsert({
    id: match?.id ?? parsed.id,
    projectId: parsed.projectId,
    namespace: LEARNING_KNOWLEDGE.strategyNamespace,
    type: LEARNING_KNOWLEDGE.playbookType,
    tagsJson: JSON.stringify(
      withSchemaVersion({ tags: ["playbook", "learning"] }),
    ),
    body: toBody(parsed.id, parsed),
    blobRef: null,
    evolutionJson: null,
  });
  return id;
}
