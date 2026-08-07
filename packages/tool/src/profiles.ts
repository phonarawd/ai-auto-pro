import { SCHEMA_VERSION } from "@clime/shared";
import { browserProfileSchema, type BrowserProfile } from "./schemas.js";

export type ToolProfileStore = {
  listProfiles: () => BrowserProfile[];
  upsertProfile: (input: {
    id?: string;
    name: string;
    kind?: BrowserProfile["kind"];
    userDataHint?: string;
  }) => BrowserProfile;
};

/**
 * In-memory browser/tool profiles (V1 lean).
 * Not a BAE session store — connectors must not import Playwright here.
 */
export function createToolProfileStore(
  seed?: ReadonlyArray<Partial<BrowserProfile> & { name: string }>,
): ToolProfileStore {
  const map = new Map<string, BrowserProfile>();

  for (const item of seed ?? [
    { id: "profile_default", name: "Default Browser Profile", kind: "browser" as const },
  ]) {
    const id = item.id ?? `profile_${map.size + 1}`;
    const profile = browserProfileSchema.parse({
      schema_version: SCHEMA_VERSION,
      id,
      name: item.name,
      kind: item.kind ?? "browser",
      userDataHint: item.userDataHint,
      createdAt: item.createdAt ?? new Date().toISOString(),
    });
    map.set(profile.id, profile);
  }

  return {
    listProfiles: () => [...map.values()],
    upsertProfile: (input) => {
      const id = input.id ?? `profile_${Date.now()}`;
      const existing = map.get(id);
      const profile = browserProfileSchema.parse({
        schema_version: SCHEMA_VERSION,
        id,
        name: input.name,
        kind: input.kind ?? existing?.kind ?? "browser",
        userDataHint: input.userDataHint ?? existing?.userDataHint,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      });
      map.set(id, profile);
      return profile;
    },
  };
}
