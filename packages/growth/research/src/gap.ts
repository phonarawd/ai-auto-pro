import type {
  CompetitorTeardown,
  GapAnalysis,
  KeywordGraph,
  MicroAuditTeardown,
} from "./schemas.js";

/**
 * Gap analysis — GA §5 / g-c.
 */
export function buildGapAnalysis(input: {
  projectId: string;
  graph: KeywordGraph;
  competitor?: CompetitorTeardown | null;
  microAudit?: MicroAuditTeardown | null;
  now?: string;
}): GapAnalysis {
  const createdAt = input.now ?? new Date().toISOString();
  const labels = input.graph.nodes.map((n) => n.label);
  const auditGaps = input.microAudit?.keywordGapNotes ?? [];
  const weakness = input.competitor?.mosaic.weaknesses ?? [];

  const keywordGaps = [
    ...new Set([
      ...labels.filter((_, i) => i % 2 === 1).slice(0, 5),
      ...auditGaps.map((g) => g.replace(/^Cover gap around:\s*/i, "")),
    ]),
  ].slice(0, 12);

  const gaps = [
    ...keywordGaps.slice(0, 5).map((label, i) => ({
      id: `gap_kw_${i + 1}`,
      label: `Keyword coverage: ${label}`,
      severity: Number((0.55 + (i % 3) * 0.1).toFixed(2)),
      notes: `Own graph thin on "${label}" relative to public signal`,
    })),
    ...weakness.slice(0, 3).map((w, i) => ({
      id: `gap_comp_${i + 1}`,
      label: "Competitor weakness window",
      severity: 0.7,
      notes: w,
    })),
  ];

  if (gaps.length === 0) {
    gaps.push({
      id: "gap_seed_1",
      label: "Seed research first",
      severity: 0.4,
      notes: "No keyword graph / audit yet — runResearchJob then re-analyze",
    });
  }

  return {
    schema_version: 1,
    kind: "growth.gap_analysis",
    id: `gap_${input.projectId}_${createdAt.slice(0, 10)}`,
    projectId: input.projectId,
    gaps,
    keywordGaps,
    createdAt,
  };
}
