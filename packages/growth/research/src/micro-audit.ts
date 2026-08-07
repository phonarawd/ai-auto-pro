import type {
  CompetitorTeardown,
  KeywordGraph,
  MicroAuditSourceKind,
  MicroAuditTeardown,
  NormalizedTrend,
} from "./schemas.js";

/**
 * Micro-Audit teardown base — GA §4 / g-b / vg-a §1.
 * Structured diagnosis only — PDF/badge/referral owned by vg-b.
 */
export function buildMicroAuditTeardown(input: {
  projectId: string;
  sourceUrl: string;
  sourceKind?: MicroAuditSourceKind;
  trends?: NormalizedTrend[];
  graph?: KeywordGraph | null;
  competitor?: CompetitorTeardown | null;
  now?: string;
}): MicroAuditTeardown | { ok: false; code: string; message: string } {
  const sourceUrl = input.sourceUrl.trim();
  if (!sourceUrl) {
    return {
      ok: false,
      code: "INVALID_SOURCE",
      message: "sourceUrl required (public URL/SNS/RSS only)",
    };
  }
  if (/session|cookie|auth_token|captcha/i.test(sourceUrl)) {
    return {
      ok: false,
      code: "PRIVATE_OR_BYPASS",
      message: "Private session / captcha bypass forbidden for Micro-Audit",
    };
  }

  const diagnosedAt = input.now ?? new Date().toISOString();
  const sourceKind: MicroAuditSourceKind =
    input.sourceKind ??
    (sourceUrl.startsWith("fixture:")
      ? "fixture"
      : sourceUrl.includes("rss")
        ? "public_rss"
        : sourceUrl.includes("x.com") || sourceUrl.includes("twitter")
          ? "public_sns"
          : "public_url");

  const topTrend = [...(input.trends ?? [])].sort(
    (a, b) => b.unifiedScore - a.unifiedScore,
  )[0];
  const trendScore = topTrend
    ? Math.min(1, (topTrend.unifiedScore + topTrend.climeFit) / 2)
    : 0.45;

  const graphLabels = (input.graph?.nodes ?? []).slice(0, 8).map((n) => n.label);
  const competitorCopy = input.competitor?.mosaic.copyPatterns ?? [];

  return {
    schema_version: 1,
    kind: "growth.micro_audit_teardown",
    id: `audit_${input.projectId}_${diagnosedAt.slice(0, 10)}`,
    projectId: input.projectId,
    sourceUrl,
    sourceKind,
    diagnosedAt,
    trendFit: {
      score: Number(trendScore.toFixed(3)),
      notes: topTrend
        ? [
            `Closest trend: ${topTrend.title}`,
            `formatTips: ${topTrend.formatTips.join(", ") || "n/a"}`,
          ]
        : ["No normalized trends yet — run research job for sharper fit"],
    },
    copyPatterns:
      competitorCopy.length > 0
        ? competitorCopy
        : ["Hook → proof → CTA", "질문형 오프닝 + 한 줄 가치 제안"],
    keywordGapNotes:
      graphLabels.length > 0
        ? graphLabels.map((l) => `Cover gap around: ${l}`)
        : ["Keyword graph empty — seed via runResearchJob"],
    climeFitTips: [
      "Capability Matrix 정직 표시 유지",
      "Validate 통과 전 게시 금지",
      "Export는 백업 로그로만 노출",
      "추정 수치는 추정 라벨 필수",
    ],
    competitorTeardownId: input.competitor?.id,
    playbookHints: [
      "10초 진단 → Brand-safe 변형 → Decision 입력",
      "무료 공개 소스만 사용 (paid API 0)",
      "공유 PDF/배지는 vg-b 경로에서만",
    ],
    paidApiRequired: false,
  };
}
