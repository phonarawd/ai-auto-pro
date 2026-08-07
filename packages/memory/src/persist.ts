import { withSchemaVersion } from "@clime/shared";
import type { ClimeStorage } from "@clime/storage";
import {
  MEMORY_KNOWLEDGE,
  memoryEpisodeSchema,
  type MemoryEpisode,
} from "./schemas.js";

export type MemoryStorage = Pick<ClimeStorage, "knowledge">;

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

function parseEpisode(body: string | null): MemoryEpisode | null {
  if (!body) return null;
  try {
    const envelope = JSON.parse(body) as StoredEnvelope;
    const parsed = memoryEpisodeSchema.safeParse(envelope.data?.payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function upsertEpisode(
  storage: MemoryStorage,
  episode: MemoryEpisode,
): Promise<void> {
  const parsed = memoryEpisodeSchema.parse(episode);
  const existing = await storage.knowledge.list(parsed.projectId, {
    namespace: MEMORY_KNOWLEDGE.namespace,
    type: MEMORY_KNOWLEDGE.episodeType,
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
    namespace: MEMORY_KNOWLEDGE.namespace,
    type: MEMORY_KNOWLEDGE.episodeType,
    tagsJson: JSON.stringify(
      withSchemaVersion({
        tags: [parsed.episodeKind, parsed.horizon],
      }),
    ),
    body: toBody(parsed.id, parsed),
    blobRef: null,
    evolutionJson: null,
  });
}

export async function listEpisodes(
  storage: MemoryStorage,
  projectId: string,
  filter?: { episodeKind?: string; horizon?: string },
): Promise<MemoryEpisode[]> {
  const rows = await storage.knowledge.list(projectId, {
    namespace: MEMORY_KNOWLEDGE.namespace,
    type: MEMORY_KNOWLEDGE.episodeType,
  });
  const out: MemoryEpisode[] = [];
  for (const row of rows) {
    const ep = parseEpisode(row.body);
    if (!ep) continue;
    if (filter?.episodeKind && ep.episodeKind !== filter.episodeKind) continue;
    if (filter?.horizon && ep.horizon !== filter.horizon) continue;
    out.push(ep);
  }
  return out.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export async function getEpisode(
  storage: MemoryStorage,
  projectId: string,
  episodeId: string,
): Promise<MemoryEpisode | null> {
  const all = await listEpisodes(storage, projectId);
  return all.find((e) => e.id === episodeId) ?? null;
}

export async function searchEpisodes(
  storage: MemoryStorage,
  projectId: string,
  query: string,
): Promise<MemoryEpisode[]> {
  const q = query.trim().toLowerCase();
  if (!q) return listEpisodes(storage, projectId);
  const all = await listEpisodes(storage, projectId);
  return all.filter((ep) => {
    if (ep.summary.toLowerCase().includes(q)) return true;
    return JSON.stringify(ep.facts).toLowerCase().includes(q);
  });
}
