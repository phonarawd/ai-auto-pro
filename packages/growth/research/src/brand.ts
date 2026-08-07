import type { BrandRulesDoc } from "./schemas.js";

/**
 * Shape consumed by `@clime/content` Validate — research must not import content.
 * Content BrandRules accepts these fields (Phase F polish).
 */
export type ContentValidateBrandRules = {
  forbiddenPhrases?: string[];
  offBrandPhrases?: string[];
  requiredPhrases?: string[];
  tone?: string;
  voice?: string;
};

export function emptyBrandRules(projectId: string, now = () => new Date().toISOString()): BrandRulesDoc {
  return {
    schema_version: 1,
    kind: "growth.brand_rules",
    projectId,
    updatedAt: now(),
    forbiddenPhrases: [],
    offBrandPhrases: [],
    requiredPhrases: [],
  };
}

/** Map persisted Brand Intelligence → Content Validate BrandRules. */
export function toValidateBrandRules(
  doc: BrandRulesDoc | null | undefined,
): ContentValidateBrandRules | undefined {
  if (!doc) return undefined;
  const forbidden = doc.forbiddenPhrases ?? [];
  const offBrand = doc.offBrandPhrases ?? [];
  const required = doc.requiredPhrases ?? [];
  if (
    forbidden.length === 0 &&
    offBrand.length === 0 &&
    required.length === 0 &&
    !doc.tone &&
    !doc.voice
  ) {
    return undefined;
  }
  return {
    forbiddenPhrases: forbidden.length > 0 ? forbidden : undefined,
    offBrandPhrases: offBrand.length > 0 ? offBrand : undefined,
    requiredPhrases: required.length > 0 ? required : undefined,
    tone: doc.tone,
    voice: doc.voice,
  };
}
