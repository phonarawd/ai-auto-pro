import { createAndSeedSqliteStorage, SEED_IDS } from "@clime/storage";
import { afterEach, describe, expect, it } from "vitest";
import { createResearchDomainHandlers } from "./api.js";
import { createResearchEngine } from "./engine.js";

const closers: Array<() => void> = [];

afterEach(() => {
  while (closers.length) closers.pop()?.();
});

describe("Persona/Emotion prefs (research-owned)", () => {
  it("persists prefs via Knowledge growth namespace — not a Settings engine", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    closers.push(() => storage.close());
    const engine = createResearchEngine(storage);
    const projectId = SEED_IDS.emptyProject;

    const empty = await engine.getPersonaPrefs(projectId);
    expect(empty.kind).toBe("growth.persona_prefs");
    expect(empty.personas).toEqual([]);

    const saved = await engine.setPersonaPrefs({
      projectId,
      personas: ["founder", "ops"],
      emotions: ["calm", "urgent"],
      notes: "Multi-Jack hints",
    });
    expect(saved.personas).toEqual(["founder", "ops"]);
    expect(saved.emotions).toContain("calm");

    const loaded = await engine.getPersonaPrefs(projectId);
    expect(loaded.notes).toBe("Multi-Jack hints");

    const rows = await storage.knowledge.list(projectId, {
      namespace: "growth",
      type: "persona_prefs",
    });
    expect(rows.length).toBeGreaterThan(0);
  });

  it("Domain handlers getPersonaPrefs / setPersonaPrefs", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    closers.push(() => storage.close());
    const engine = createResearchEngine(storage);
    const handlers = createResearchDomainHandlers(engine, {
      defaultProjectId: SEED_IDS.emptyProject,
    });
    const ctx = {
      requestId: "req_persona",
      traceId: "tr_persona",
      projectId: SEED_IDS.emptyProject,
    };

    const setRes = (await handlers["growth.setPersonaPrefs"]!(
      { personas: ["creator"], emotions: ["curious"] },
      ctx,
    )) as { ok: boolean; prefs: { personas: string[] } };
    expect(setRes.ok).toBe(true);
    expect(setRes.prefs.personas).toContain("creator");

    const getRes = (await handlers["growth.getPersonaPrefs"]!({}, ctx)) as {
      kind: string;
      emotions: string[];
    };
    expect(getRes.kind).toBe("growth.persona_prefs");
    expect(getRes.emotions).toContain("curious");
  });
});
