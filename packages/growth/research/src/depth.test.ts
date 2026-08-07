import { describe, expect, it } from "vitest";
import { createSqliteStorage } from "@clime/storage";
import { createResearchEngine } from "./engine.js";
import { createResearchDomainHandlers } from "./api.js";
import {
  competitorTeardownSchema,
  gapAnalysisSchema,
  microAuditTeardownSchema,
  opportunityScoreSchema,
  researcherReportSchema,
  viralSignalSchema,
} from "./schemas.js";

describe("G-B Researcher + Competitor + Micro-Audit", () => {
  it("builds Researcher report with feedsDecision and paidApiRequired=false", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "G-B-R" });
      const engine = createResearchEngine(storage);
      await engine.runResearchJob({ projectId, traceId: "tr_gb_r" });

      const result = await engine.runResearcherJob({
        projectId,
        traceId: "tr_gb_r2",
      });
      expect(result.jobId).toMatch(/^job_/);
      const report = researcherReportSchema.parse(result.report);
      expect(report.kind).toBe("growth.researcher_report");
      expect(report.feedsDecision).toBe(true);
      expect(report.paidApiRequired).toBe(false);
      expect(report.patterns.length).toBeGreaterThan(0);
      expect(report.brandSafeVariants.length).toBeGreaterThan(0);
    } finally {
      storage.close();
    }
  });

  it("competitor teardown from public URL; rejects session/captcha paths", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "G-B-C" });
      const engine = createResearchEngine(storage);

      const ok = await engine.runCompetitorTeardown({
        projectId,
        targetUrl: "https://example.com/public-feed",
      });
      expect(ok.ok).toBe(true);
      if (!ok.ok) return;
      const teardown = competitorTeardownSchema.parse(ok.teardown);
      expect(teardown.kind).toBe("growth.competitor_teardown");
      expect(teardown.paidApiRequired).toBe(false);
      expect(teardown.mosaic.copyPatterns.length).toBeGreaterThan(0);

      const bad = await engine.runCompetitorTeardown({
        projectId,
        targetUrl: "https://evil.example/session=abc&captcha=1",
      });
      expect(bad.ok).toBe(false);
      if (bad.ok) return;
      expect(bad.code).toBe("PRIVATE_OR_BYPASS");
    } finally {
      storage.close();
    }
  });

  it("Micro-Audit teardown has schema_version, no pdf/referral (vg-a §1 base only)", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "G-B-M" });
      const engine = createResearchEngine(storage);
      await engine.runResearchJob({ projectId, traceId: "tr_gb_m" });

      const result = await engine.runMicroAudit({
        projectId,
        sourceUrl: "https://example.com/brand",
        targetUrl: "https://competitor.example/public",
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const audit = microAuditTeardownSchema.parse(result.audit);
      expect(audit.kind).toBe("growth.micro_audit_teardown");
      expect(audit.paidApiRequired).toBe(false);
      expect(audit.trendFit.score).toBeGreaterThanOrEqual(0);
      expect(audit.climeFitTips.length).toBeGreaterThan(0);
      expect(audit.playbookHints.length).toBeGreaterThan(0);
      expect(result.audit).not.toHaveProperty("pdfPath");
      expect(result.audit).not.toHaveProperty("referralBadge");
      expect(result.audit).not.toHaveProperty("exportBackupPath");

      const loaded = await engine.getMicroAudit(projectId);
      expect(loaded?.id).toBe(audit.id);
    } finally {
      storage.close();
    }
  });
});

describe("G-C Gap + Opportunity + Viral", () => {
  it("analyzes gap, viral, and opportunity with 추정 labels", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "G-C" });
      const engine = createResearchEngine(storage);
      await engine.runResearchJob({ projectId, traceId: "tr_gc" });
      await engine.runMicroAudit({
        projectId,
        sourceUrl: "fixture:public-brand",
        sourceKind: "fixture",
      });

      const gap = gapAnalysisSchema.parse(await engine.analyzeGap({ projectId }));
      expect(gap.kind).toBe("growth.gap_analysis");
      expect(gap.gaps.length).toBeGreaterThan(0);

      const viral = viralSignalSchema.parse(await engine.analyzeViral({ projectId }));
      expect(viral.kind).toBe("growth.viral_signal");
      expect(viral.paidApiRequired).toBe(false);
      expect(viral.signals.length).toBeGreaterThan(0);
      expect(viral).not.toHaveProperty("pdfPath");
      expect(viral).not.toHaveProperty("channels");

      const opp = opportunityScoreSchema.parse(
        await engine.scoreOpportunity({ projectId }),
      );
      expect(opp.kind).toBe("growth.opportunity_score");
      expect(opp.opportunities.length).toBeGreaterThan(0);
      for (const row of opp.opportunities) {
        expect(row.isEstimate).toBe(true);
        expect(row.estimateLabel).toBe("추정");
      }
    } finally {
      storage.close();
    }
  });

  it("domain handlers expose G depth channels", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "G-API" });
      const engine = createResearchEngine(storage);
      const handlers = createResearchDomainHandlers(engine, {
        defaultProjectId: projectId,
      });
      await engine.runResearchJob({ projectId, traceId: "tr_api" });

      const audit = (await handlers["growth.runMicroAudit"]!(
        { projectId, sourceUrl: "https://example.com/x" },
        { requestId: "r1", traceId: "t1", projectId },
      )) as { ok: boolean };
      expect(audit.ok).toBe(true);

      const gap = (await handlers["growth.analyzeGap"]!(
        { projectId },
        { requestId: "r2", traceId: "t2", projectId },
      )) as { kind: string };
      expect(gap.kind).toBe("growth.gap_analysis");

      const viral = (await handlers["growth.analyzeViral"]!(
        { projectId },
        { requestId: "r3", traceId: "t3", projectId },
      )) as { kind: string; paidApiRequired: boolean };
      expect(viral.kind).toBe("growth.viral_signal");
      expect(viral.paidApiRequired).toBe(false);

      const opp = (await handlers["growth.scoreOpportunity"]!(
        { projectId },
        { requestId: "r4", traceId: "t4", projectId },
      )) as { opportunities: Array<{ estimateLabel: string }> };
      expect(opp.opportunities[0]?.estimateLabel).toBe("추정");
    } finally {
      storage.close();
    }
  });
});
