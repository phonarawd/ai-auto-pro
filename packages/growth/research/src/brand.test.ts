import { describe, expect, it } from "vitest";
import { createSqliteStorage } from "@clime/storage";
import { emptyBrandRules, toValidateBrandRules } from "./brand.js";
import { createResearchEngine } from "./engine.js";
import { createResearchDomainHandlers } from "./api.js";
import { brandRulesDocSchema } from "./schemas.js";

describe("F-A Brand Intelligence (research)", () => {
  it("persists brand rules in Knowledge namespace=brand", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "Brand" });
      const engine = createResearchEngine(storage);

      const empty = await engine.getBrandRules(projectId);
      expect(empty.kind).toBe("growth.brand_rules");
      expect(empty.forbiddenPhrases).toEqual([]);

      const saved = await engine.setBrandRules({
        projectId,
        tone: "ops-honest",
        voice: "CLIME Growth Studio",
        forbiddenPhrases: ["완전 자동 수익"],
        offBrandPhrases: ["spam botnet"],
        requiredPhrases: ["CLIME"],
      });
      expect(brandRulesDocSchema.parse(saved).tone).toBe("ops-honest");

      const loaded = await engine.getBrandRules(projectId);
      expect(loaded.forbiddenPhrases).toContain("완전 자동 수익");
      expect(loaded.offBrandPhrases).toContain("spam botnet");
      expect(loaded.requiredPhrases).toContain("CLIME");
    } finally {
      storage.close();
    }
  });

  it("toValidateBrandRules maps for Content Validate", () => {
    const doc = emptyBrandRules("p1");
    expect(toValidateBrandRules(doc)).toBeUndefined();

    const mapped = toValidateBrandRules({
      ...doc,
      forbiddenPhrases: ["x"],
      offBrandPhrases: ["y"],
      requiredPhrases: ["CLIME"],
      tone: "calm",
    });
    expect(mapped).toEqual({
      forbiddenPhrases: ["x"],
      offBrandPhrases: ["y"],
      requiredPhrases: ["CLIME"],
      tone: "calm",
      voice: undefined,
    });
  });

  it("Domain handlers getBrandRules / setBrandRules", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "API" });
      const engine = createResearchEngine(storage);
      const handlers = createResearchDomainHandlers(engine, {
        defaultProjectId: projectId,
      });
      const ctx = { requestId: "r1", traceId: "tr1", projectId };

      const setRes = (await handlers["growth.setBrandRules"]!(
        { forbiddenPhrases: ["guaranteed money"] },
        ctx,
      )) as { ok: boolean; brand: { forbiddenPhrases: string[] } };
      expect(setRes.ok).toBe(true);
      expect(setRes.brand.forbiddenPhrases).toContain("guaranteed money");

      const getRes = (await handlers["growth.getBrandRules"]!({}, ctx)) as {
        forbiddenPhrases: string[];
      };
      expect(getRes.forbiddenPhrases).toContain("guaranteed money");
    } finally {
      storage.close();
    }
  });
});
