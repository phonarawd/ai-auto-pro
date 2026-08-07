export {
  createResearchEngine,
  emptyPersonaPrefs,
  type ResearchEngine,
  type SetBrandRulesInput,
  type SetPersonaPrefsInput,
} from "./engine.js";

export { createResearchDomainHandlers } from "./api.js";

export {
  createDefaultTrendSources,
  createGoogleTrendsPublicSource,
  type TrendSource,
} from "./sources.js";

export { normalizeTrendBatch } from "./normalize.js";

export {
  buildKeywordGraphFromTrends,
  emptyKeywordGraph,
} from "./keyword-graph.js";

export { buildMultiJackContentHook } from "./multi-jack-hook.js";

export { buildMultiJackVariantPack } from "./multi-jack-pack.js";

export { writeMicroAuditViralExport } from "./micro-audit-export.js";

export {
  buildClimeReferralBadge,
  buildReferralUrl,
  formatBadgeFooter,
  generateReferralCode,
  POWERED_BY_WORDMARK,
  REFERRAL_BASE_URL,
} from "./referral-badge.js";

export { buildSimplePdf } from "./pdf-lite.js";

export {
  emptyBrandRules,
  toValidateBrandRules,
  type ContentValidateBrandRules,
} from "./brand.js";

export { buildResearcherReport } from "./researcher.js";

export { buildCompetitorTeardown } from "./competitor.js";

export { buildMicroAuditTeardown } from "./micro-audit.js";

export { buildGapAnalysis } from "./gap.js";

export { buildOpportunityScore } from "./opportunity.js";

export { buildViralSignal } from "./viral.js";

export {
  brandRulesDocSchema,
  competitorTeardownSchema,
  gapAnalysisSchema,
  keywordGraphSchema,
  keywordTypeSchema,
  microAuditTeardownSchema,
  multiJackContentHookSchema,
  normalizedTrendSchema,
  opportunityScoreSchema,
  personaPrefsDocSchema,
  researcherReportSchema,
  trendRawBatchSchema,
  viralSignalSchema,
  BRAND_KNOWLEDGE,
  DEPTH_KNOWLEDGE,
  PERSONA_KNOWLEDGE,
  RESEARCH_KNOWLEDGE,
  type BrandRulesDoc,
  type CompetitorTeardown,
  type GapAnalysis,
  type KeywordGraph,
  type KeywordType,
  type MicroAuditSourceKind,
  type MicroAuditTeardown,
  type MultiJackContentHook,
  type NormalizedTrend,
  type OpportunityScore,
  type PersonaPrefsDoc,
  type ResearcherReport,
  type TrendRawBatch,
  type ViralSignal,
} from "./schemas.js";

export {
  climeReferralBadgeSchema,
  microAuditViralExportManifestSchema,
  multiJackFormatIdSchema,
  multiJackVariantPackSchema,
  MULTI_JACK_FORMAT_IDS,
  type ClimeReferralBadge,
  type MicroAuditViralExportManifest,
  type MultiJackFormatId,
  type MultiJackVariant,
  type MultiJackVariantPack,
  type ReferralPlacedOn,
} from "./viral-schemas.js";

export { generateJobId } from "./job-id.js";
