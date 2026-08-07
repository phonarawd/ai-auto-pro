import {
  CHANNEL_TEMPLATES,
  isRepurposeChannelId,
  type RepurposeChannelId,
} from "./channels.js";
import { buildArtifactMeta, parseArtifactMeta } from "./meta.js";
import type { ArtifactValidation, ContentArtifactMeta } from "./schemas.js";

const DEFAULT_FORBIDDEN = [
  /guaranteed\s+profit/i,
  /무위험\s*수익/,
  /확실한\s*수익/,
  /100%\s*수익/,
  /risk[\s-]*free\s+returns?/i,
];

/**
 * Brand rules consumed by Validate.
 * Source-of-truth is `growth/research` Brand Intelligence; Content only applies.
 */
export type BrandRules = {
  forbiddenPhrases?: (string | RegExp)[];
  /** Off-brand / “CLIME답지 않음” markers */
  offBrandPhrases?: (string | RegExp)[];
  /** When non-empty, body must include at least one */
  requiredPhrases?: string[];
  tone?: string;
  voice?: string;
};

export type ValidateInput = {
  channel: string;
  metaJson: string;
  brand?: BrandRules;
  now?: () => string;
};

export type ValidateResult =
  | {
      ok: true;
      meta: ContentArtifactMeta;
      validation: ArtifactValidation;
      status: "validated";
    }
  | {
      ok: false;
      meta?: ContentArtifactMeta;
      validation: ArtifactValidation;
      status: "failed_validation";
      errors: string[];
    };

function nowIso(now?: () => string): string {
  return now?.() ?? new Date().toISOString();
}

function matchesPhrase(body: string, phrase: string | RegExp): boolean {
  return typeof phrase === "string" ? body.includes(phrase) : phrase.test(body);
}

function hasActiveBrandRules(brand?: BrandRules): boolean {
  if (!brand) return false;
  return Boolean(
    (brand.forbiddenPhrases && brand.forbiddenPhrases.length > 0) ||
      (brand.offBrandPhrases && brand.offBrandPhrases.length > 0) ||
      (brand.requiredPhrases && brand.requiredPhrases.length > 0) ||
      brand.tone ||
      brand.voice,
  );
}

export function runValidate(input: ValidateInput): ValidateResult {
  const checks: ArtifactValidation["checks"] = {};
  const errors: string[] = [];
  const checkedAt = nowIso(input.now);

  const parsed = parseArtifactMeta(input.metaJson);
  if (!parsed.ok) {
    checks.schema = "fail";
    errors.push(...parsed.errors);
    const validation: ArtifactValidation = {
      passed: false,
      checkedAt,
      errors,
      checks,
    };
    return { ok: false, validation, status: "failed_validation", errors };
  }

  checks.schema = "pass";
  const meta = parsed.meta;

  if (meta.body.trim().length < 1) {
    checks.body_nonempty = "fail";
    errors.push("body must be non-empty");
  } else {
    checks.body_nonempty = "pass";
  }

  const forbidden = [
    ...DEFAULT_FORBIDDEN,
    ...(input.brand?.forbiddenPhrases ?? []),
  ];
  const hit = forbidden.find((p) => matchesPhrase(meta.body, p));
  if (hit) {
    checks.forbidden_phrases = "fail";
    errors.push("body matches forbidden / high-risk earnings phrase");
  } else {
    checks.forbidden_phrases = "pass";
  }

  if (isRepurposeChannelId(input.channel)) {
    const tpl = CHANNEL_TEMPLATES[input.channel as RepurposeChannelId];
    if (meta.body.length > tpl.maxBodyLength) {
      checks.channel_template = "fail";
      errors.push(
        `channel ${input.channel} body exceeds max length ${tpl.maxBodyLength}`,
      );
    } else {
      checks.channel_template = "pass";
    }
  } else {
    checks.channel_template = "skip";
  }

  // Phase F: Brand Intelligence check (replaces stub-only path when rules present)
  if (hasActiveBrandRules(input.brand)) {
    let brandOk = true;

    const offBrand = input.brand?.offBrandPhrases ?? [];
    const offHit = offBrand.find((p) => matchesPhrase(meta.body, p));
    if (offHit) {
      brandOk = false;
      errors.push("CLIME답지 않음 — body matches off-brand phrase");
    }

    const required = input.brand?.requiredPhrases ?? [];
    if (required.length > 0) {
      const hasRequired = required.some((p) => meta.body.includes(p));
      if (!hasRequired) {
        brandOk = false;
        errors.push("brand required phrase missing from body");
      }
    }

    // Brand forbidden already folded into forbidden_phrases; mirror into brand check
    if (checks.forbidden_phrases === "fail" && (input.brand?.forbiddenPhrases?.length ?? 0) > 0) {
      brandOk = false;
    }

    checks.brand = brandOk ? "pass" : "fail";
    // Keep brand_stub as pass/fail alias for C1A readers; prefer `brand`
    checks.brand_stub = checks.brand;
  } else {
    checks.brand = "skip";
    checks.brand_stub = "skip";
  }

  const passed = errors.length === 0;
  const validation: ArtifactValidation = {
    passed,
    checkedAt,
    errors,
    checks,
  };

  const nextMeta = buildArtifactMeta({
    body: meta.body,
    title: meta.title,
    prompt: meta.prompt,
    hooks: meta.hooks,
    hashtags: meta.hashtags,
    sourceContentItemId: meta.sourceContentItemId,
    packId: meta.packId,
    validation,
  });

  if (!passed) {
    return {
      ok: false,
      meta: nextMeta,
      validation,
      status: "failed_validation",
      errors,
    };
  }

  return {
    ok: true,
    meta: nextMeta,
    validation,
    status: "validated",
  };
}

/** Statuses that may proceed to Optimize / Repurpose (C1A §2.2). */
export const POST_VALIDATE_STATUSES = new Set([
  "validated",
  "optimized",
  "ready",
]);

export function assertValidatedStatus(status: string): boolean {
  return POST_VALIDATE_STATUSES.has(status);
}
