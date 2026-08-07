import { SCHEMA_VERSION, withSchemaVersion } from "@clime/shared";
import type { ClimeStorage, KnowledgeItemRow } from "@clime/storage";
import {
  knowledgeItemViewSchema,
  type KnowledgeItemView,
  type KnowledgeNamespace,
} from "./schemas.js";

export type KnowledgeStorage = Pick<ClimeStorage, "knowledge">;

export type KnowledgeListFilter = {
  namespace?: string;
  type?: string;
  tags?: string[];
};

function parseTags(tagsJson: string): string[] {
  try {
    const parsed = JSON.parse(tagsJson) as { tags?: unknown };
    if (Array.isArray(parsed.tags)) {
      return parsed.tags.filter((t): t is string => typeof t === "string");
    }
  } catch {
    /* ignore */
  }
  return [];
}

type StoredEnvelope = {
  schema_version: 1;
  data?: {
    key?: string;
    payload?: unknown;
  };
};

function toBody(type: string, payload: unknown): string {
  return JSON.stringify(
    withSchemaVersion({
      data: {
        key: type,
        payload:
          payload !== undefined && typeof payload === "object" && payload !== null
            ? (payload as Record<string, unknown>)
            : { value: payload },
      },
    }),
  );
}

function parseBody(body: string | null): unknown {
  if (!body) return undefined;
  try {
    const envelope = JSON.parse(body) as StoredEnvelope;
    if (envelope?.data && "payload" in envelope.data) {
      return envelope.data.payload;
    }
    return envelope;
  } catch {
    return body;
  }
}

function toView(row: KnowledgeItemRow): KnowledgeItemView {
  return knowledgeItemViewSchema.parse({
    schema_version: SCHEMA_VERSION,
    kind: "knowledge.item",
    id: row.id,
    projectId: row.projectId,
    namespace: row.namespace,
    type: row.type,
    tags: parseTags(row.tagsJson),
    body: parseBody(row.body),
    blobRef: row.blobRef,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
  });
}

function matchesQuery(view: KnowledgeItemView, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    view.namespace,
    view.type,
    ...view.tags,
    typeof view.body === "string" ? view.body : JSON.stringify(view.body ?? ""),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

/**
 * Growth-facing Knowledge Store access — unified store, namespaced filters.
 * Not a parallel god-object; persists via Storage KnowledgeRepository only.
 */
export type KnowledgeStore = {
  list(
    projectId: string,
    filter?: KnowledgeListFilter,
  ): Promise<KnowledgeItemView[]>;
  get(projectId: string, id: string): Promise<KnowledgeItemView | null>;
  search(
    projectId: string,
    query: string,
    filter?: KnowledgeListFilter,
  ): Promise<KnowledgeItemView[]>;
  put(input: {
    projectId: string;
    id?: string;
    namespace: string;
    type: string;
    tags?: string[];
    body?: unknown;
    blobRef?: string | null;
  }): Promise<{ schema_version: 1; saved: boolean; id: string }>;
  delete(
    projectId: string,
    id: string,
  ): Promise<{ schema_version: 1; deleted: boolean }>;
};

export function createKnowledgeStore(storage: KnowledgeStorage): KnowledgeStore {
  return {
    async list(projectId, filter) {
      const rows = await storage.knowledge.list(projectId, {
        namespace: filter?.namespace,
        type: filter?.type,
      });
      let views = rows.map(toView);
      if (filter?.tags && filter.tags.length > 0) {
        const want = new Set(filter.tags.map((t) => t.toLowerCase()));
        views = views.filter((v) =>
          v.tags.some((t) => want.has(t.toLowerCase())),
        );
      }
      return views;
    },

    async get(projectId, id) {
      const row = await storage.knowledge.getById(id);
      if (!row || row.projectId !== projectId) return null;
      return toView(row);
    },

    async search(projectId, query, filter) {
      const listed = await this.list(projectId, filter);
      return listed.filter((v) => matchesQuery(v, query));
    },

    async put(input) {
      const tagsJson = JSON.stringify(
        withSchemaVersion({ tags: input.tags ?? [] }),
      );
      const body =
        input.body === undefined ? null : toBody(input.type, input.body);
      const result = await storage.knowledge.upsert({
        id: input.id,
        projectId: input.projectId,
        namespace: input.namespace,
        type: input.type,
        tagsJson,
        body,
        blobRef: input.blobRef ?? null,
        evolutionJson: null,
      });
      return {
        schema_version: 1 as const,
        saved: true as const,
        id: result.id,
      };
    },

    async delete(projectId, id) {
      const row = await storage.knowledge.getById(id);
      if (!row || row.projectId !== projectId) {
        return { schema_version: 1 as const, deleted: false as const };
      }
      await storage.knowledge.remove(id);
      return { schema_version: 1 as const, deleted: true as const };
    },
  };
}

export function isKnownNamespace(value: string): value is KnowledgeNamespace {
  return (
    value === "brand" ||
    value === "growth" ||
    value === "competitor" ||
    value === "system" ||
    value === "strategy"
  );
}
