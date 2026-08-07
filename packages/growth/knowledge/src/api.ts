import { SCHEMA_VERSION } from "@clime/shared";
import type { KnowledgeStore } from "./store.js";

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

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.filter((v): v is string => typeof v === "string");
  return out.length > 0 ? out : undefined;
}

/**
 * KnowledgeAPI handlers — namespaced Knowledge Store CRUD/search.
 */
export function createKnowledgeDomainHandlers(
  store: KnowledgeStore,
  options?: { defaultProjectId?: string },
): Record<string, DomainHandler> {
  const defaultProjectId = options?.defaultProjectId;

  const resolveProjectId = (
    args: ArgRecord,
    ctx: { projectId?: string | null },
  ) => asString(args.projectId, ctx.projectId ?? defaultProjectId ?? "");

  return {
    "knowledge.list": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      if (!projectId) return [];
      return store.list(projectId, {
        namespace: asString(args.namespace) || undefined,
        type: asString(args.type) || undefined,
        tags: asStringArray(args.tags),
      });
    },

    "knowledge.get": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      const id = asString(args.id) || asString(args.key);
      if (!projectId || !id) {
        return {
          schema_version: SCHEMA_VERSION,
          item: null,
          errors: ["projectId and id required"],
        };
      }
      const item = await store.get(projectId, id);
      return { schema_version: SCHEMA_VERSION, item };
    },

    "knowledge.search": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      if (!projectId) return [];
      return store.search(projectId, asString(args.query), {
        namespace: asString(args.namespace) || undefined,
        type: asString(args.type) || undefined,
        tags: asStringArray(args.tags),
      });
    },

    "knowledge.put": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      const namespace = asString(args.namespace);
      const type = asString(args.type) || asString(args.key) || "note";
      if (!projectId || !namespace) {
        return {
          schema_version: SCHEMA_VERSION,
          saved: false,
          id: "",
          message: "projectId and namespace required",
        };
      }
      const body =
        args.body !== undefined
          ? args.body
          : args.value !== undefined
            ? args.value
            : undefined;
      return store.put({
        projectId,
        id: asString(args.id) || undefined,
        namespace,
        type,
        tags: asStringArray(args.tags),
        body,
        blobRef:
          typeof args.blobRef === "string" || args.blobRef === null
            ? (args.blobRef as string | null)
            : undefined,
      });
    },

    "knowledge.delete": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      const id = asString(args.id) || asString(args.key);
      if (!projectId || !id) {
        return {
          schema_version: SCHEMA_VERSION,
          deleted: false,
          message: "projectId and id required",
        };
      }
      return store.delete(projectId, id);
    },
  };
}
