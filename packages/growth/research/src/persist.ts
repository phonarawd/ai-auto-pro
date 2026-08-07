import { withSchemaVersion } from "@clime/shared";
import type { ClimeStorage } from "@clime/storage";
import {
  brandRulesDocSchema,
  BRAND_KNOWLEDGE,
  competitorTeardownSchema,
  DEPTH_KNOWLEDGE,
  gapAnalysisSchema,
  keywordGraphSchema,
  microAuditTeardownSchema,
  normalizedTrendsDocSchema,
  opportunityScoreSchema,
  PERSONA_KNOWLEDGE,
  personaPrefsDocSchema,
  RESEARCH_KNOWLEDGE,
  researcherReportSchema,
  viralSignalSchema,
  type BrandRulesDoc,
  type CompetitorTeardown,
  type GapAnalysis,
  type KeywordGraph,
  type MicroAuditTeardown,
  type NormalizedTrend,
  type NormalizedTrendsDoc,
  type OpportunityScore,
  type PersonaPrefsDoc,
  type ResearcherReport,
  type ViralSignal,
} from "./schemas.js";

export type ResearchStorage = Pick<ClimeStorage, "knowledge">;

type StoredEnvelope = {
  schema_version: 1;
  data?: {
    key?: string;
    payload?: unknown;
  };
};

function toBody(key: string, payload: Record<string, unknown>): string {
  return JSON.stringify(
    withSchemaVersion({
      data: { key, payload },
    }),
  );
}

async function upsertTyped(
  storage: ResearchStorage,
  projectId: string,
  type: string,
  key: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const existing = await storage.knowledge.list(projectId, {
    namespace: RESEARCH_KNOWLEDGE.namespace,
    type,
  });
  const match = existing.find((row) => {
    try {
      const parsed = JSON.parse(row.body ?? "{}") as StoredEnvelope;
      return parsed.data?.key === key;
    } catch {
      return false;
    }
  });
  await storage.knowledge.upsert({
    id: match?.id,
    projectId,
    namespace: RESEARCH_KNOWLEDGE.namespace,
    type,
    tagsJson: JSON.stringify(withSchemaVersion({ tags: [type] })),
    body: toBody(key, payload),
    blobRef: null,
    evolutionJson: null,
  });
}

async function readPayload(
  storage: ResearchStorage,
  projectId: string,
  type: string,
  key: string,
): Promise<unknown | null> {
  const rows = await storage.knowledge.list(projectId, {
    namespace: RESEARCH_KNOWLEDGE.namespace,
    type,
  });
  for (const row of rows) {
    if (!row.body) continue;
    try {
      const parsed = JSON.parse(row.body) as StoredEnvelope;
      if (parsed.data?.key === key) return parsed.data.payload ?? null;
    } catch {
      /* skip */
    }
  }
  return null;
}

export async function saveKeywordGraph(
  storage: ResearchStorage,
  graph: KeywordGraph,
): Promise<void> {
  await upsertTyped(
    storage,
    graph.projectId,
    RESEARCH_KNOWLEDGE.graphType,
    RESEARCH_KNOWLEDGE.graphKey,
    graph as unknown as Record<string, unknown>,
  );
}

export async function loadKeywordGraph(
  storage: ResearchStorage,
  projectId: string,
): Promise<KeywordGraph | null> {
  const raw = await readPayload(
    storage,
    projectId,
    RESEARCH_KNOWLEDGE.graphType,
    RESEARCH_KNOWLEDGE.graphKey,
  );
  const parsed = keywordGraphSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function saveNormalizedTrends(
  storage: ResearchStorage,
  doc: NormalizedTrendsDoc,
): Promise<void> {
  await upsertTyped(
    storage,
    doc.projectId,
    RESEARCH_KNOWLEDGE.trendsType,
    RESEARCH_KNOWLEDGE.trendsKey,
    doc as unknown as Record<string, unknown>,
  );
}

export async function loadNormalizedTrends(
  storage: ResearchStorage,
  projectId: string,
): Promise<NormalizedTrend[]> {
  const raw = await readPayload(
    storage,
    projectId,
    RESEARCH_KNOWLEDGE.trendsType,
    RESEARCH_KNOWLEDGE.trendsKey,
  );
  const parsed = normalizedTrendsDocSchema.safeParse(raw);
  return parsed.success ? parsed.data.trends : [];
}

async function upsertBrand(
  storage: ResearchStorage,
  projectId: string,
  type: string,
  key: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const existing = await storage.knowledge.list(projectId, {
    namespace: BRAND_KNOWLEDGE.namespace,
    type,
  });
  const match = existing.find((row) => {
    try {
      const parsed = JSON.parse(row.body ?? "{}") as StoredEnvelope;
      return parsed.data?.key === key;
    } catch {
      return false;
    }
  });
  await storage.knowledge.upsert({
    id: match?.id,
    projectId,
    namespace: BRAND_KNOWLEDGE.namespace,
    type,
    tagsJson: JSON.stringify(withSchemaVersion({ tags: [type] })),
    body: toBody(key, payload),
    blobRef: null,
    evolutionJson: null,
  });
}

async function readBrandPayload(
  storage: ResearchStorage,
  projectId: string,
  type: string,
  key: string,
): Promise<unknown | null> {
  const rows = await storage.knowledge.list(projectId, {
    namespace: BRAND_KNOWLEDGE.namespace,
    type,
  });
  for (const row of rows) {
    if (!row.body) continue;
    try {
      const parsed = JSON.parse(row.body) as StoredEnvelope;
      if (parsed.data?.key === key) return parsed.data.payload ?? null;
    } catch {
      /* skip */
    }
  }
  return null;
}

export async function saveBrandRules(
  storage: ResearchStorage,
  doc: BrandRulesDoc,
): Promise<void> {
  await upsertBrand(
    storage,
    doc.projectId,
    BRAND_KNOWLEDGE.type,
    BRAND_KNOWLEDGE.key,
    doc as unknown as Record<string, unknown>,
  );
}

export async function loadBrandRules(
  storage: ResearchStorage,
  projectId: string,
): Promise<BrandRulesDoc | null> {
  const raw = await readBrandPayload(
    storage,
    projectId,
    BRAND_KNOWLEDGE.type,
    BRAND_KNOWLEDGE.key,
  );
  const parsed = brandRulesDocSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function savePersonaPrefs(
  storage: ResearchStorage,
  doc: PersonaPrefsDoc,
): Promise<void> {
  await upsertTyped(
    storage,
    doc.projectId,
    PERSONA_KNOWLEDGE.type,
    PERSONA_KNOWLEDGE.key,
    doc as unknown as Record<string, unknown>,
  );
}

export async function loadPersonaPrefs(
  storage: ResearchStorage,
  projectId: string,
): Promise<PersonaPrefsDoc | null> {
  const raw = await readPayload(
    storage,
    projectId,
    PERSONA_KNOWLEDGE.type,
    PERSONA_KNOWLEDGE.key,
  );
  const parsed = personaPrefsDocSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

async function saveDepthDoc(
  storage: ResearchStorage,
  projectId: string,
  type: string,
  key: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await upsertTyped(storage, projectId, type, key, payload);
}

async function loadDepthDoc(
  storage: ResearchStorage,
  projectId: string,
  type: string,
  key: string,
): Promise<unknown | null> {
  return readPayload(storage, projectId, type, key);
}

export async function saveResearcherReport(
  storage: ResearchStorage,
  doc: ResearcherReport,
): Promise<void> {
  await saveDepthDoc(
    storage,
    doc.projectId,
    DEPTH_KNOWLEDGE.researcherType,
    DEPTH_KNOWLEDGE.researcherKey,
    doc as unknown as Record<string, unknown>,
  );
}

export async function loadResearcherReport(
  storage: ResearchStorage,
  projectId: string,
): Promise<ResearcherReport | null> {
  const raw = await loadDepthDoc(
    storage,
    projectId,
    DEPTH_KNOWLEDGE.researcherType,
    DEPTH_KNOWLEDGE.researcherKey,
  );
  const parsed = researcherReportSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function saveCompetitorTeardown(
  storage: ResearchStorage,
  doc: CompetitorTeardown,
): Promise<void> {
  await saveDepthDoc(
    storage,
    doc.projectId,
    DEPTH_KNOWLEDGE.competitorType,
    DEPTH_KNOWLEDGE.competitorKey,
    doc as unknown as Record<string, unknown>,
  );
}

export async function loadCompetitorTeardown(
  storage: ResearchStorage,
  projectId: string,
): Promise<CompetitorTeardown | null> {
  const raw = await loadDepthDoc(
    storage,
    projectId,
    DEPTH_KNOWLEDGE.competitorType,
    DEPTH_KNOWLEDGE.competitorKey,
  );
  const parsed = competitorTeardownSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function saveMicroAuditTeardown(
  storage: ResearchStorage,
  doc: MicroAuditTeardown,
): Promise<void> {
  await saveDepthDoc(
    storage,
    doc.projectId,
    DEPTH_KNOWLEDGE.microAuditType,
    DEPTH_KNOWLEDGE.microAuditKey,
    doc as unknown as Record<string, unknown>,
  );
}

export async function loadMicroAuditTeardown(
  storage: ResearchStorage,
  projectId: string,
): Promise<MicroAuditTeardown | null> {
  const raw = await loadDepthDoc(
    storage,
    projectId,
    DEPTH_KNOWLEDGE.microAuditType,
    DEPTH_KNOWLEDGE.microAuditKey,
  );
  const parsed = microAuditTeardownSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function saveGapAnalysis(
  storage: ResearchStorage,
  doc: GapAnalysis,
): Promise<void> {
  await saveDepthDoc(
    storage,
    doc.projectId,
    DEPTH_KNOWLEDGE.gapType,
    DEPTH_KNOWLEDGE.gapKey,
    doc as unknown as Record<string, unknown>,
  );
}

export async function loadGapAnalysis(
  storage: ResearchStorage,
  projectId: string,
): Promise<GapAnalysis | null> {
  const raw = await loadDepthDoc(
    storage,
    projectId,
    DEPTH_KNOWLEDGE.gapType,
    DEPTH_KNOWLEDGE.gapKey,
  );
  const parsed = gapAnalysisSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function saveOpportunityScore(
  storage: ResearchStorage,
  doc: OpportunityScore,
): Promise<void> {
  await saveDepthDoc(
    storage,
    doc.projectId,
    DEPTH_KNOWLEDGE.opportunityType,
    DEPTH_KNOWLEDGE.opportunityKey,
    doc as unknown as Record<string, unknown>,
  );
}

export async function loadOpportunityScore(
  storage: ResearchStorage,
  projectId: string,
): Promise<OpportunityScore | null> {
  const raw = await loadDepthDoc(
    storage,
    projectId,
    DEPTH_KNOWLEDGE.opportunityType,
    DEPTH_KNOWLEDGE.opportunityKey,
  );
  const parsed = opportunityScoreSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function saveViralSignal(
  storage: ResearchStorage,
  doc: ViralSignal,
): Promise<void> {
  await saveDepthDoc(
    storage,
    doc.projectId,
    DEPTH_KNOWLEDGE.viralType,
    DEPTH_KNOWLEDGE.viralKey,
    doc as unknown as Record<string, unknown>,
  );
}

export async function loadViralSignal(
  storage: ResearchStorage,
  projectId: string,
): Promise<ViralSignal | null> {
  const raw = await loadDepthDoc(
    storage,
    projectId,
    DEPTH_KNOWLEDGE.viralType,
    DEPTH_KNOWLEDGE.viralKey,
  );
  const parsed = viralSignalSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
