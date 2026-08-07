import type { CompetitorTeardown } from "./schemas.js";

function hostHint(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//i, "").split(/[/?#]/)[0] || "public";
  }
}

/**
 * Competitor Watch teardown — GA §3 / g-b.
 * Public URL/SNS only; V1 uses deterministic public-fixture heuristics (no scrape session).
 */
export function buildCompetitorTeardown(input: {
  projectId: string;
  targetUrl: string;
  now?: string;
}): CompetitorTeardown | { ok: false; code: string; message: string } {
  const url = input.targetUrl.trim();
  if (!url) {
    return {
      ok: false,
      code: "INVALID_TARGET",
      message: "targetUrl required (public URL/SNS only)",
    };
  }
  // Reject obvious non-public session markers — honesty over fake scores
  if (/session|cookie|auth_token|captcha/i.test(url)) {
    return {
      ok: false,
      code: "PRIVATE_OR_BYPASS",
      message: "Private session / captcha paths are forbidden for Competitor Watch",
    };
  }

  const host = hostHint(url);
  const createdAt = input.now ?? new Date().toISOString();
  const idSeed = host.replace(/[^a-z0-9]+/gi, "_").slice(0, 40) || "target";

  return {
    schema_version: 1,
    kind: "growth.competitor_teardown",
    id: `comp_${idSeed}_${createdAt.slice(0, 10)}`,
    projectId: input.projectId,
    targetUrl: url,
    mosaic: {
      strengths: [
        `${host} 공개 채널 빈도가 높아 보임`,
        "짧은 훅 + CTA 반복 패턴 추정",
      ],
      weaknesses: [
        "Brand-safe / Validate 경로가 불명확할 수 있음",
        "Capability·게시 리스크 설명이 약함",
      ],
      copyPatterns: [
        `${host}: 문제제기 → 해결 약속 → CTA`,
        "숫자/속도 강조 카피 빈출",
      ],
      formats: ["shorts", "threads", "card_news", "reels"],
    },
    paidApiRequired: false,
    createdAt,
  };
}
