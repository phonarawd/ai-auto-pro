import { emptyBrandRules } from "./brand.js";
import { buildCompetitorTeardown } from "./competitor.js";
import { buildGapAnalysis } from "./gap.js";
import { emptyKeywordGraph, buildKeywordGraphFromTrends } from "./keyword-graph.js";
import { generateJobId } from "./job-id.js";
import { buildMicroAuditTeardown } from "./micro-audit.js";
import {
  writeMicroAuditViralExport,
  type MicroAuditViralExportResult,
} from "./micro-audit-export.js";
import { buildMultiJackContentHook } from "./multi-jack-hook.js";
import { buildMultiJackVariantPack } from "./multi-jack-pack.js";
import { normalizeTrendBatch } from "./normalize.js";
import { buildOpportunityScore } from "./opportunity.js";
import {
  loadBrandRules,
  loadCompetitorTeardown,
  loadGapAnalysis,
  loadKeywordGraph,
  loadMicroAuditTeardown,
  loadNormalizedTrends,
  loadOpportunityScore,
  loadPersonaPrefs,
  loadResearcherReport,
  loadViralSignal,
  saveBrandRules,
  saveCompetitorTeardown,
  saveGapAnalysis,
  saveKeywordGraph,
  saveMicroAuditTeardown,
  saveNormalizedTrends,
  saveOpportunityScore,
  savePersonaPrefs,
  saveResearcherReport,
  saveViralSignal,
  type ResearchStorage,
} from "./persist.js";
import { buildResearcherReport } from "./researcher.js";
import type {
  BrandRulesDoc,
  CompetitorTeardown,
  GapAnalysis,
  KeywordGraph,
  MicroAuditSourceKind,
  MicroAuditTeardown,
  MultiJackContentHook,
  NormalizedTrend,
  OpportunityScore,
  PersonaPrefsDoc,
  ResearcherReport,
  ViralSignal,
} from "./schemas.js";
import { createDefaultTrendSources, type TrendSource } from "./sources.js";
import { buildViralSignal } from "./viral.js";
import type { MultiJackVariantPack } from "./viral-schemas.js";

export type SetBrandRulesInput = {
  projectId: string;
  tone?: string;
  voice?: string;
  forbiddenPhrases?: string[];
  offBrandPhrases?: string[];
  requiredPhrases?: string[];
};

export type SetPersonaPrefsInput = {
  projectId: string;
  personas?: string[];
  emotions?: string[];
  notes?: string;
};

export function emptyPersonaPrefs(
  projectId: string,
  now = () => new Date().toISOString(),
): PersonaPrefsDoc {
  return {
    schema_version: 1,
    kind: "growth.persona_prefs",
    projectId,
    updatedAt: now(),
    personas: [],
    emotions: [],
  };
}

type ErrResult = {
  schema_version: 1;
  ok: false;
  code: string;
  message: string;
};

export type ResearchEngine = {
  runResearchJob(input: {
    projectId: string;
    topic?: string;
    traceId: string;
  }): Promise<{
    schema_version: 1;
    jobId: string;
    traceId: string;
    trendCount: number;
    graphNodeCount: number;
  }>;
  getKeywordGraph(projectId: string): Promise<KeywordGraph>;
  getNormalizedTrends(projectId: string): Promise<NormalizedTrend[]>;
  buildMultiJackHook(input: {
    projectId: string;
    trendId: string;
    personaHints?: string[];
  }): Promise<
    | { schema_version: 1; ok: true; hook: MultiJackContentHook }
    | ErrResult
  >;
  getBrandRules(projectId: string): Promise<BrandRulesDoc>;
  setBrandRules(input: SetBrandRulesInput): Promise<BrandRulesDoc>;
  /** Prefs only — full Persona/Emotion engines stay research-owned / later. */
  getPersonaPrefs(projectId: string): Promise<PersonaPrefsDoc>;
  setPersonaPrefs(input: SetPersonaPrefsInput): Promise<PersonaPrefsDoc>;

  /** Phase G depth — GA / g-b / g-c */
  runResearcherJob(input: {
    projectId: string;
    traceId: string;
  }): Promise<{
    schema_version: 1;
    jobId: string;
    traceId: string;
    report: ResearcherReport;
  }>;
  runCompetitorTeardown(input: {
    projectId: string;
    targetUrl: string;
  }): Promise<
    | { schema_version: 1; ok: true; teardown: CompetitorTeardown }
    | ErrResult
  >;
  runMicroAudit(input: {
    projectId: string;
    sourceUrl: string;
    sourceKind?: MicroAuditSourceKind;
    targetUrl?: string;
  }): Promise<
    | { schema_version: 1; ok: true; audit: MicroAuditTeardown }
    | ErrResult
  >;
  getMicroAudit(projectId: string): Promise<MicroAuditTeardown | null>;
  analyzeGap(input: { projectId: string }): Promise<GapAnalysis>;
  scoreOpportunity(input: { projectId: string }): Promise<OpportunityScore>;
  analyzeViral(input: { projectId: string }): Promise<ViralSignal>;
  getResearcherReport(projectId: string): Promise<ResearcherReport | null>;
  getOpportunityScore(projectId: string): Promise<OpportunityScore | null>;

  /** vg-b — PDF/infographic + badge + referral (not Export backup). */
  exportMicroAuditViral(input: {
    projectId: string;
    exportRoot: string;
    exportDate?: string;
    referralCode?: string;
    locale?: string;
  }): Promise<MicroAuditViralExportResult>;

  /** vg-c — meme/card-news/Shorts/Threads pack from Multi-Jack hook. */
  buildMultiJackPack(input: {
    projectId: string;
    trendId: string;
    personaHints?: string[];
  }): Promise<
    | { schema_version: 1; ok: true; pack: MultiJackVariantPack }
    | ErrResult
  >;
};

export function createResearchEngine(
  storage: ResearchStorage,
  options?: {
    sources?: TrendSource[];
    generateJobId?: () => string;
  },
): ResearchEngine {
  const sources = options?.sources ?? createDefaultTrendSources();
  const jobIdFn = options?.generateJobId ?? generateJobId;

  return {
    async runResearchJob(input) {
      const jobId = jobIdFn();
      const allNormalized: NormalizedTrend[] = [];

      for (const source of sources) {
        if (source.kind !== "free_public") {
          throw new Error(`Paid/non-free trend source blocked: ${source.id}`);
        }
        const batch = await source.fetch(input.projectId, input.traceId);
        const normalized = normalizeTrendBatch(batch);
        const filtered =
          input.topic && input.topic.trim().length > 0
            ? normalized.filter((t) =>
                `${t.title} ${t.query}`.toLowerCase().includes(input.topic!.toLowerCase()),
              )
            : normalized;
        allNormalized.push(...(filtered.length > 0 ? filtered : normalized));
      }

      const byId = new Map<string, NormalizedTrend>();
      for (const t of allNormalized) {
        const prev = byId.get(t.id);
        if (!prev || t.unifiedScore > prev.unifiedScore) byId.set(t.id, t);
      }
      const trends = [...byId.values()].sort((a, b) => b.unifiedScore - a.unifiedScore);

      const previous = await loadKeywordGraph(storage, input.projectId);
      const graph = buildKeywordGraphFromTrends(input.projectId, trends, previous);
      await saveKeywordGraph(storage, graph);
      await saveNormalizedTrends(storage, {
        schema_version: 1,
        kind: "growth.normalized_trends_doc",
        projectId: input.projectId,
        updatedAt: new Date().toISOString(),
        trends,
      });

      return {
        schema_version: 1 as const,
        jobId,
        traceId: input.traceId,
        trendCount: trends.length,
        graphNodeCount: graph.nodes.length,
      };
    },

    async getKeywordGraph(projectId) {
      return (await loadKeywordGraph(storage, projectId)) ?? emptyKeywordGraph(projectId);
    },

    async getNormalizedTrends(projectId) {
      return loadNormalizedTrends(storage, projectId);
    },

    async buildMultiJackHook(input) {
      const trends = await loadNormalizedTrends(storage, input.projectId);
      const trend = trends.find((t) => t.id === input.trendId);
      if (!trend) {
        return {
          schema_version: 1 as const,
          ok: false as const,
          code: "TREND_NOT_FOUND",
          message: `Normalized trend not found: ${input.trendId}`,
        };
      }
      const hook = buildMultiJackContentHook(trend, {
        personaHints: input.personaHints,
      });
      return { schema_version: 1 as const, ok: true as const, hook };
    },

    async getBrandRules(projectId) {
      return (await loadBrandRules(storage, projectId)) ?? emptyBrandRules(projectId);
    },

    async setBrandRules(input) {
      const previous = await loadBrandRules(storage, input.projectId);
      const doc: BrandRulesDoc = {
        schema_version: 1,
        kind: "growth.brand_rules",
        projectId: input.projectId,
        updatedAt: new Date().toISOString(),
        tone: input.tone ?? previous?.tone,
        voice: input.voice ?? previous?.voice,
        forbiddenPhrases: input.forbiddenPhrases ?? previous?.forbiddenPhrases ?? [],
        offBrandPhrases: input.offBrandPhrases ?? previous?.offBrandPhrases ?? [],
        requiredPhrases: input.requiredPhrases ?? previous?.requiredPhrases ?? [],
      };
      await saveBrandRules(storage, doc);
      return doc;
    },

    async getPersonaPrefs(projectId) {
      return (
        (await loadPersonaPrefs(storage, projectId)) ??
        emptyPersonaPrefs(projectId)
      );
    },

    async setPersonaPrefs(input) {
      const previous = await loadPersonaPrefs(storage, input.projectId);
      const doc: PersonaPrefsDoc = {
        schema_version: 1,
        kind: "growth.persona_prefs",
        projectId: input.projectId,
        updatedAt: new Date().toISOString(),
        personas: input.personas ?? previous?.personas ?? [],
        emotions: input.emotions ?? previous?.emotions ?? [],
        notes: input.notes ?? previous?.notes,
      };
      await savePersonaPrefs(storage, doc);
      return doc;
    },

    async runResearcherJob(input) {
      const jobId = jobIdFn();
      const trends = await loadNormalizedTrends(storage, input.projectId);
      const graph =
        (await loadKeywordGraph(storage, input.projectId)) ??
        emptyKeywordGraph(input.projectId);
      const report = buildResearcherReport({
        projectId: input.projectId,
        trends,
        graph,
      });
      await saveResearcherReport(storage, report);
      return {
        schema_version: 1 as const,
        jobId,
        traceId: input.traceId,
        report,
      };
    },

    async runCompetitorTeardown(input) {
      const built = buildCompetitorTeardown({
        projectId: input.projectId,
        targetUrl: input.targetUrl,
      });
      if ("ok" in built && built.ok === false) {
        return {
          schema_version: 1 as const,
          ok: false as const,
          code: built.code,
          message: built.message,
        };
      }
      const teardown = built as CompetitorTeardown;
      await saveCompetitorTeardown(storage, teardown);
      return { schema_version: 1 as const, ok: true as const, teardown };
    },

    async runMicroAudit(input) {
      const trends = await loadNormalizedTrends(storage, input.projectId);
      const graph = await loadKeywordGraph(storage, input.projectId);
      let competitor = await loadCompetitorTeardown(storage, input.projectId);
      if (input.targetUrl?.trim()) {
        const built = buildCompetitorTeardown({
          projectId: input.projectId,
          targetUrl: input.targetUrl,
        });
        if (!("ok" in built && built.ok === false)) {
          competitor = built as CompetitorTeardown;
          await saveCompetitorTeardown(storage, competitor);
        }
      }
      const audit = buildMicroAuditTeardown({
        projectId: input.projectId,
        sourceUrl: input.sourceUrl,
        sourceKind: input.sourceKind,
        trends,
        graph,
        competitor,
      });
      if ("ok" in audit && audit.ok === false) {
        return {
          schema_version: 1 as const,
          ok: false as const,
          code: audit.code,
          message: audit.message,
        };
      }
      const doc = audit as MicroAuditTeardown;
      await saveMicroAuditTeardown(storage, doc);
      return { schema_version: 1 as const, ok: true as const, audit: doc };
    },

    async getMicroAudit(projectId) {
      return loadMicroAuditTeardown(storage, projectId);
    },

    async analyzeGap(input) {
      const graph =
        (await loadKeywordGraph(storage, input.projectId)) ??
        emptyKeywordGraph(input.projectId);
      const competitor = await loadCompetitorTeardown(storage, input.projectId);
      const microAudit = await loadMicroAuditTeardown(storage, input.projectId);
      const doc = buildGapAnalysis({
        projectId: input.projectId,
        graph,
        competitor,
        microAudit,
      });
      await saveGapAnalysis(storage, doc);
      return doc;
    },

    async scoreOpportunity(input) {
      const trends = await loadNormalizedTrends(storage, input.projectId);
      const gap = await loadGapAnalysis(storage, input.projectId);
      const viral = await loadViralSignal(storage, input.projectId);
      const doc = buildOpportunityScore({
        projectId: input.projectId,
        trends,
        gap,
        viral,
      });
      await saveOpportunityScore(storage, doc);
      return doc;
    },

    async analyzeViral(input) {
      const trends = await loadNormalizedTrends(storage, input.projectId);
      const doc = buildViralSignal({
        projectId: input.projectId,
        trends,
      });
      await saveViralSignal(storage, doc);
      return doc;
    },

    async getResearcherReport(projectId) {
      return loadResearcherReport(storage, projectId);
    },

    async getOpportunityScore(projectId) {
      return loadOpportunityScore(storage, projectId);
    },

    async exportMicroAuditViral(input) {
      const audit = await loadMicroAuditTeardown(storage, input.projectId);
      if (!audit) {
        return {
          ok: false as const,
          code: "AUDIT_NOT_FOUND",
          message: "Run growth.runMicroAudit before viral export",
        };
      }
      return writeMicroAuditViralExport({
        audit,
        exportRoot: input.exportRoot,
        exportDate: input.exportDate,
        referralCode: input.referralCode,
        locale: input.locale,
      });
    },

    async buildMultiJackPack(input) {
      const trends = await loadNormalizedTrends(storage, input.projectId);
      const trend = trends.find((t) => t.id === input.trendId);
      if (!trend) {
        return {
          schema_version: 1 as const,
          ok: false as const,
          code: "TREND_NOT_FOUND",
          message: `Normalized trend not found: ${input.trendId}`,
        };
      }
      const hook = buildMultiJackContentHook(trend, {
        personaHints: input.personaHints,
      });
      const pack = buildMultiJackVariantPack({
        projectId: input.projectId,
        hook,
        personaHints: input.personaHints,
      });
      return { schema_version: 1 as const, ok: true as const, pack };
    },
  };
}
