import { createAndSeedSqliteStorage, SEED_IDS } from "@clime/storage";
import { afterEach, describe, expect, it } from "vitest";
import { createKnowledgeDomainHandlers } from "./api.js";
import { createKnowledgeStore } from "./store.js";

const closers: Array<() => void> = [];

afterEach(() => {
  while (closers.length) closers.pop()?.();
});

async function open() {
  const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
  closers.push(() => storage.close());
  const store = createKnowledgeStore(storage);
  return { store, storage, projectId: SEED_IDS.emptyProject };
}

describe("@clime/growth-knowledge", () => {
  it("puts/lists/searches/deletes by namespace", async () => {
    const { store, projectId } = await open();
    const put = await store.put({
      projectId,
      namespace: "strategy",
      type: "playbook",
      tags: ["organic", "v1"],
      body: { title: "Zero-cost loop", steps: 3 },
    });
    expect(put.saved).toBe(true);

    const listed = await store.list(projectId, { namespace: "strategy" });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.namespace).toBe("strategy");
    expect(listed[0]?.tags).toContain("organic");

    const found = await store.search(projectId, "zero-cost", {
      namespace: "strategy",
    });
    expect(found).toHaveLength(1);

    const del = await store.delete(projectId, put.id);
    expect(del.deleted).toBe(true);
    expect(await store.list(projectId, { namespace: "strategy" })).toHaveLength(0);
  });

  it("Domain handlers round-trip", async () => {
    const { store, projectId } = await open();
    const handlers = createKnowledgeDomainHandlers(store, {
      defaultProjectId: projectId,
    });
    const ctx = {
      requestId: "req_kb",
      traceId: "tr_kb",
      projectId,
    };
    const putRes = (await handlers["knowledge.put"]!(
      {
        namespace: "growth",
        type: "note",
        tags: ["kb"],
        body: { text: "namespaced" },
      },
      ctx,
    )) as { saved: boolean; id: string };
    expect(putRes.saved).toBe(true);

    const list = (await handlers["knowledge.list"]!(
      { namespace: "growth" },
      ctx,
    )) as unknown[];
    expect(list.length).toBeGreaterThan(0);

    const del = (await handlers["knowledge.delete"]!(
      { id: putRes.id },
      ctx,
    )) as { deleted: boolean };
    expect(del.deleted).toBe(true);
  });
});
