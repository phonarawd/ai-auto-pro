import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createAndSeedSqliteStorage, SEED_IDS } from "@clime/storage";
import { afterEach, describe, expect, it } from "vitest";
import { createKnowledgeDomainHandlers } from "./api.js";
import { KNOWLEDGE_NAMESPACES } from "./schemas.js";
import { createKnowledgeStore } from "./store.js";

const here = dirname(fileURLToPath(import.meta.url));
const closers: Array<() => void> = [];

afterEach(() => {
  while (closers.length) closers.pop()?.();
});

describe("K1-C Knowledge Store prove", () => {
  it("namespaced CRUD + search — single store", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    closers.push(() => storage.close());
    const store = createKnowledgeStore(storage);
    const projectId = SEED_IDS.emptyProject;

    await store.put({
      projectId,
      namespace: "strategy",
      type: "playbook",
      tags: ["organic"],
      body: { title: "loop" },
    });
    await store.put({
      projectId,
      namespace: "brand",
      type: "note",
      tags: ["voice"],
      body: { text: "tone" },
    });

    expect(await store.list(projectId, { namespace: "strategy" })).toHaveLength(1);
    expect(await store.list(projectId, { namespace: "brand" })).toHaveLength(1);
    expect(
      (await store.search(projectId, "loop", { namespace: "strategy" })).length,
    ).toBe(1);
  });

  it("Domain handlers + namespaces SSOT", async () => {
    expect(KNOWLEDGE_NAMESPACES).toEqual([
      "brand",
      "growth",
      "competitor",
      "system",
      "strategy",
    ]);
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    closers.push(() => storage.close());
    const handlers = createKnowledgeDomainHandlers(createKnowledgeStore(storage), {
      defaultProjectId: SEED_IDS.emptyProject,
    });
    const ctx = {
      requestId: "r",
      traceId: "t",
      projectId: SEED_IDS.emptyProject,
    };
    const put = (await handlers["knowledge.put"]!(
      { namespace: "system", type: "doc", body: { ok: true } },
      ctx,
    )) as { saved: boolean };
    expect(put.saved).toBe(true);

    const index = readFileSync(join(here, "index.ts"), "utf8");
    expect(index).toContain("Knowledge Store");
    expect(index).not.toMatch(/prisma|supabase/i);
  });
});
