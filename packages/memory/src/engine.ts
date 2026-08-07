import { withSchemaVersion } from "@clime/shared";
import type { MemoryStorage } from "./persist.js";
import {
  getEpisode,
  listEpisodes,
  searchEpisodes,
  upsertEpisode,
} from "./persist.js";
import type {
  EpisodeKind,
  MemoryEpisode,
  MemoryHorizon,
} from "./schemas.js";

export type RecordEpisodeInput = {
  projectId: string;
  episodeKind: EpisodeKind;
  summary: string;
  facts?: Record<string, unknown>;
  horizon?: MemoryHorizon;
  occurredAt?: string;
  id?: string;
  traceId?: string;
  now?: Date;
};

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Memory Engine — episodes/facts only (IA / RFC 11).
 * Policies never live here; Learning owns Confidence + policies.
 */
export function createMemoryEngine(storage: MemoryStorage) {
  return {
    async recordEpisode(input: RecordEpisodeInput): Promise<MemoryEpisode> {
      const nowIso = (input.now ?? new Date()).toISOString();
      const episode = withSchemaVersion({
        kind: "memory.episode" as const,
        id: input.id ?? newId("ep"),
        projectId: input.projectId,
        episodeKind: input.episodeKind,
        horizon: input.horizon ?? ("short" as const),
        summary: input.summary,
        facts: input.facts ?? {},
        occurredAt: input.occurredAt ?? nowIso,
        createdAt: nowIso,
        traceId: input.traceId,
      });
      await upsertEpisode(storage, episode);
      return episode;
    },

    async listEpisodes(
      projectId: string,
      filter?: { episodeKind?: string; horizon?: string },
    ): Promise<MemoryEpisode[]> {
      return listEpisodes(storage, projectId, filter);
    },

    async getEpisode(
      projectId: string,
      episodeId: string,
    ): Promise<MemoryEpisode | null> {
      return getEpisode(storage, projectId, episodeId);
    },

    async search(projectId: string, query: string): Promise<MemoryEpisode[]> {
      return searchEpisodes(storage, projectId, query);
    },
  };
}

export type MemoryEngine = ReturnType<typeof createMemoryEngine>;
