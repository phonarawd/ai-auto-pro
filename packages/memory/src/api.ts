import type { MemoryEngine } from "./engine.js";

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

/**
 * MemoryAPI handlers — RFC 11 / S3A / IA.
 * Read-heavy; recordEpisode available for host/tests (not aggressive UI writes).
 */
export function createMemoryDomainHandlers(
  engine: MemoryEngine,
  options?: { defaultProjectId?: string },
): Record<string, DomainHandler> {
  const defaultProjectId = options?.defaultProjectId;

  return {
    "memory.listEpisodes": async (args, ctx) => {
      const projectId = asString(
        args.projectId,
        ctx.projectId ?? defaultProjectId ?? "",
      );
      if (!projectId) return [];
      return engine.listEpisodes(projectId, {
        episodeKind: asString(args.episodeKind) || undefined,
        horizon: asString(args.horizon) || undefined,
      });
    },

    "memory.getEpisode": async (args, ctx) => {
      const projectId = asString(
        args.projectId,
        ctx.projectId ?? defaultProjectId ?? "",
      );
      const episodeId = asString(args.episodeId);
      if (!projectId || !episodeId) {
        return { schema_version: 1, episodeId: episodeId || "stub", episode: null };
      }
      const episode = await engine.getEpisode(projectId, episodeId);
      return {
        schema_version: 1 as const,
        episodeId,
        episode,
      };
    },

    "memory.search": async (args, ctx) => {
      const projectId = asString(
        args.projectId,
        ctx.projectId ?? defaultProjectId ?? "",
      );
      if (!projectId) return [];
      return engine.search(projectId, asString(args.query));
    },

    "memory.recordEpisode": async (args, ctx) => {
      const projectId = asString(
        args.projectId,
        ctx.projectId ?? defaultProjectId ?? "",
      );
      const summary = asString(args.summary).trim();
      const episodeKind = asString(args.episodeKind, "ai");
      if (!projectId || !summary) {
        return {
          schema_version: 1,
          ok: false,
          message: "projectId and summary required",
        };
      }
      const kind =
        episodeKind === "user" ||
        episodeKind === "campaign" ||
        episodeKind === "keyword" ||
        episodeKind === "brand" ||
        episodeKind === "ai" ||
        episodeKind === "roi"
          ? episodeKind
          : "ai";
      const episode = await engine.recordEpisode({
        projectId,
        episodeKind: kind,
        summary,
        facts:
          args.facts && typeof args.facts === "object"
            ? (args.facts as Record<string, unknown>)
            : {},
        horizon:
          args.horizon === "long" || args.horizon === "archive"
            ? args.horizon
            : "short",
        traceId: ctx.traceId,
      });
      return { schema_version: 1 as const, ok: true, episode };
    },
  };
}
