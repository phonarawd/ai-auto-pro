import { withSchemaVersionSchema } from "@clime/shared";
import { z } from "zod";

export const keywordTypeSchema = z.enum([
  "Primary",
  "Secondary",
  "Long-tail",
  "Question",
  "Commercial",
  "Evergreen",
  "Seasonal",
  "Trending",
]);
export type KeywordType = z.infer<typeof keywordTypeSchema>;

export const trendRawItemSchema = z.object({
  externalId: z.string().min(1),
  title: z.string().min(1),
  query: z.string().optional(),
  scoreHint: z.number().min(0).max(1).optional(),
  tags: z.array(z.string()).optional(),
  url: z.string().optional(),
});

export const trendRawBatchSchema = withSchemaVersionSchema({
  kind: z.literal("growth.trend_raw_batch"),
  sourceId: z.string().min(1),
  fetchedAt: z.string().min(1),
  items: z.array(trendRawItemSchema),
});
export type TrendRawBatch = z.infer<typeof trendRawBatchSchema>;

export const normalizedTrendSchema = withSchemaVersionSchema({
  kind: z.literal("growth.normalized_trend"),
  id: z.string().min(1),
  title: z.string().min(1),
  query: z.string().min(1),
  sourceId: z.string().min(1),
  unifiedScore: z.number().min(0).max(1),
  climeFit: z.number().min(0).max(1),
  formatTips: z.array(z.string()),
  keywords: z.array(z.string()),
  normalizedAt: z.string().min(1),
});
export type NormalizedTrend = z.infer<typeof normalizedTrendSchema>;

export const normalizedTrendsDocSchema = withSchemaVersionSchema({
  kind: z.literal("growth.normalized_trends_doc"),
  projectId: z.string().min(1),
  updatedAt: z.string().min(1),
  trends: z.array(normalizedTrendSchema),
});
export type NormalizedTrendsDoc = z.infer<typeof normalizedTrendsDocSchema>;

export const keywordGraphSchema = withSchemaVersionSchema({
  kind: z.literal("growth.keyword_graph"),
  projectId: z.string().min(1),
  updatedAt: z.string().min(1),
  nodes: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      type: keywordTypeSchema,
      score: z.number().min(0).max(1).optional(),
    }),
  ),
  edges: z.array(
    z.object({
      from: z.string().min(1),
      to: z.string().min(1),
      relation: z.enum(["related", "expands", "follows"]),
    }),
  ),
});
export type KeywordGraph = z.infer<typeof keywordGraphSchema>;

export const multiJackContentHookSchema = withSchemaVersionSchema({
  kind: z.literal("growth.multi_jack_content_hook"),
  trendId: z.string().min(1),
  hotTopic: z.string().min(1),
  query: z.string().min(1),
  keywords: z.array(z.string()),
  formatTips: z.array(z.string()),
  unifiedScore: z.number().min(0).max(1),
  climeFit: z.number().min(0).max(1),
  personaHints: z.array(z.string()).optional(),
  paidApiRequired: z.literal(false),
});
export type MultiJackContentHook = z.infer<typeof multiJackContentHookSchema>;

export const RESEARCH_KNOWLEDGE = {
  namespace: "growth",
  graphType: "keyword_graph",
  trendsType: "normalized_trends",
  graphKey: "keyword_graph",
  trendsKey: "normalized_trends",
} as const;

/** Brand Intelligence SoT — Knowledge namespace=brand (RFC 11). */
export const BRAND_KNOWLEDGE = {
  namespace: "brand",
  type: "brand_rules",
  key: "brand_rules",
} as const;

/**
 * Persona / Emotion prefs — research-owned prefs (not a full Persona engine).
 * Persist as KnowledgeItem; Settings UI edits via Domain API only.
 */
export const PERSONA_KNOWLEDGE = {
  namespace: "growth",
  type: "persona_prefs",
  key: "persona_prefs",
} as const;

export const personaPrefsDocSchema = withSchemaVersionSchema({
  kind: z.literal("growth.persona_prefs"),
  projectId: z.string().min(1),
  updatedAt: z.string().min(1),
  /** Audience / operator persona labels for Multi-Jack hints. */
  personas: z.array(z.string()),
  /** Desired emotional tone tags (prefs only — no scoring engine). */
  emotions: z.array(z.string()),
  /** Free-form notes for research Multi-Jack / Variant packs. */
  notes: z.string().optional(),
});
export type PersonaPrefsDoc = z.infer<typeof personaPrefsDocSchema>;

/**
 * Research-owned Brand rules — feeds Content Validate (Phase F).
 * Persist as KnowledgeItem; no first-class Brand table in V1.
 */
export const brandRulesDocSchema = withSchemaVersionSchema({
  kind: z.literal("growth.brand_rules"),
  projectId: z.string().min(1),
  updatedAt: z.string().min(1),
  tone: z.string().optional(),
  voice: z.string().optional(),
  /** Phrases that must never appear (Validate fail). */
  forbiddenPhrases: z.array(z.string()),
  /** Off-brand / “CLIME답지 않음” markers — Validate fail. */
  offBrandPhrases: z.array(z.string()),
  /** When non-empty, at least one phrase must appear in body. */
  requiredPhrases: z.array(z.string()),
});
export type BrandRulesDoc = z.infer<typeof brandRulesDocSchema>;

/** Phase G depth Knowledge types — GA §9. */
export const DEPTH_KNOWLEDGE = {
  namespace: "growth",
  researcherType: "researcher_report",
  researcherKey: "researcher_report",
  competitorType: "competitor_teardown",
  competitorKey: "competitor_teardown",
  microAuditType: "micro_audit_teardown",
  microAuditKey: "micro_audit_teardown",
  gapType: "gap_analysis",
  gapKey: "gap_analysis",
  opportunityType: "opportunity_score",
  opportunityKey: "opportunity_score",
  viralType: "viral_signal",
  viralKey: "viral_signal",
} as const;

export const researcherReportSchema = withSchemaVersionSchema({
  kind: z.literal("growth.researcher_report"),
  id: z.string().min(1),
  projectId: z.string().min(1),
  patterns: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      hook: z.string().optional(),
      formatTips: z.array(z.string()),
      evidence: z.array(z.string()),
    }),
  ),
  brandSafeVariants: z.array(z.string()),
  feedsDecision: z.literal(true),
  paidApiRequired: z.literal(false),
  createdAt: z.string().min(1),
});
export type ResearcherReport = z.infer<typeof researcherReportSchema>;

export const competitorTeardownSchema = withSchemaVersionSchema({
  kind: z.literal("growth.competitor_teardown"),
  id: z.string().min(1),
  projectId: z.string().min(1),
  targetUrl: z.string().min(1),
  mosaic: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    copyPatterns: z.array(z.string()),
    formats: z.array(z.string()),
  }),
  paidApiRequired: z.literal(false),
  createdAt: z.string().min(1),
});
export type CompetitorTeardown = z.infer<typeof competitorTeardownSchema>;

export const microAuditSourceKindSchema = z.enum([
  "public_url",
  "public_sns",
  "public_rss",
  "fixture",
]);
export type MicroAuditSourceKind = z.infer<typeof microAuditSourceKindSchema>;

export const microAuditTeardownSchema = withSchemaVersionSchema({
  kind: z.literal("growth.micro_audit_teardown"),
  id: z.string().min(1),
  projectId: z.string().min(1),
  sourceUrl: z.string().min(1),
  sourceKind: microAuditSourceKindSchema,
  diagnosedAt: z.string().min(1),
  trendFit: z.object({
    score: z.number().min(0).max(1),
    notes: z.array(z.string()),
  }),
  copyPatterns: z.array(z.string()),
  keywordGapNotes: z.array(z.string()),
  climeFitTips: z.array(z.string()),
  competitorTeardownId: z.string().optional(),
  playbookHints: z.array(z.string()),
  paidApiRequired: z.literal(false),
});
export type MicroAuditTeardown = z.infer<typeof microAuditTeardownSchema>;

export const gapAnalysisSchema = withSchemaVersionSchema({
  kind: z.literal("growth.gap_analysis"),
  id: z.string().min(1),
  projectId: z.string().min(1),
  gaps: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      severity: z.number().min(0).max(1),
      notes: z.string(),
    }),
  ),
  keywordGaps: z.array(z.string()),
  createdAt: z.string().min(1),
});
export type GapAnalysis = z.infer<typeof gapAnalysisSchema>;

export const opportunityScoreSchema = withSchemaVersionSchema({
  kind: z.literal("growth.opportunity_score"),
  id: z.string().min(1),
  projectId: z.string().min(1),
  opportunities: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      score: z.number().min(0).max(1),
      rationale: z.string(),
      isEstimate: z.literal(true),
      estimateLabel: z.literal("추정"),
    }),
  ),
  createdAt: z.string().min(1),
});
export type OpportunityScore = z.infer<typeof opportunityScoreSchema>;

export const viralSignalSchema = withSchemaVersionSchema({
  kind: z.literal("growth.viral_signal"),
  id: z.string().min(1),
  projectId: z.string().min(1),
  signals: z.array(
    z.object({
      id: z.string().min(1),
      topic: z.string().min(1),
      viralityScore: z.number().min(0).max(1),
      hooks: z.array(z.string()),
      formatTips: z.array(z.string()),
    }),
  ),
  paidApiRequired: z.literal(false),
  createdAt: z.string().min(1),
});
export type ViralSignal = z.infer<typeof viralSignalSchema>;
