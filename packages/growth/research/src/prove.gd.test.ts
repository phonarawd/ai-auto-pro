import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createSqliteStorage } from "@clime/storage";
import { createResearchEngine } from "./engine.js";
import { microAuditTeardownSchema, opportunityScoreSchema } from "./schemas.js";

function listDirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

const ALLOWED_GROWTH = new Set([
  "research",
  "planning",
  "decision",
  "revenue",
  "knowledge",
]);

const FORBIDDEN_TOP_LEVEL = [
  "viral",
  "competitor",
  "gap",
  "opportunity",
  "researcher",
  "micro-audit",
  "micro_audit",
];

describe("G-D Research Depth Prove", () => {
  it("depth module seats exist only under growth/research/src", () => {
    const src = join(process.cwd(), "src");
    for (const file of [
      "researcher.ts",
      "competitor.ts",
      "micro-audit.ts",
      "gap.ts",
      "opportunity.ts",
      "viral.ts",
    ]) {
      expect(existsSync(join(src, file)), file).toBe(true);
    }
  });

  it("top-level engine packages for depth modules = 0", () => {
    const packagesRoot = join(process.cwd(), "../..");
    for (const name of FORBIDDEN_TOP_LEVEL) {
      expect(existsSync(join(packagesRoot, name)), `packages/${name}`).toBe(false);
    }
  });

  it("Growth dirs ⊆ five umbrellas only", () => {
    const growthRoot = join(process.cwd(), "..");
    const dirs = listDirs(growthRoot).filter(
      (d) => !d.startsWith(".") && d !== "node_modules",
    );
    expect(dirs).toContain("research");
    for (const d of dirs) {
      expect(ALLOWED_GROWTH.has(d), `unexpected growth umbrella: ${d}`).toBe(true);
    }
  });

  it("Micro-Audit + Opportunity contract fields (paidApi 0, 추정)", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "G-D" });
      const engine = createResearchEngine(storage);
      await engine.runResearchJob({ projectId, traceId: "tr_gd" });
      const auditRes = await engine.runMicroAudit({
        projectId,
        sourceUrl: "https://example.com/public",
      });
      expect(auditRes.ok).toBe(true);
      if (!auditRes.ok) return;
      const audit = microAuditTeardownSchema.parse(auditRes.audit);
      expect(audit.paidApiRequired).toBe(false);
      expect(JSON.stringify(audit)).not.toMatch(/pdfPath|referralBadge|exportBackupPath/);

      await engine.analyzeViral({ projectId });
      await engine.analyzeGap({ projectId });
      const opp = opportunityScoreSchema.parse(
        await engine.scoreOpportunity({ projectId }),
      );
      for (const row of opp.opportunities) {
        expect(row.isEstimate).toBe(true);
        expect(row.estimateLabel).toBe("추정");
      }
    } finally {
      storage.close();
    }
  });

  it("package.json stays lean — no prisma/supabase/vendor/pdf god deps", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { name: string; dependencies?: Record<string, string> };
    expect(pkg.name).toBe("@clime/growth-research");
    const deps = Object.keys(pkg.dependencies ?? {});
    expect(deps).not.toContain("prisma");
    expect(deps).not.toContain("@supabase/supabase-js");
    expect(deps).not.toContain("playwright");
    expect(deps).not.toContain("openai");
    expect(deps).not.toContain("pdfkit");
    expect(deps).not.toContain("@clime/growth-planning");
  });
});
