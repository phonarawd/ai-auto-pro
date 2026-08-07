import { createHash, randomBytes } from "node:crypto";
import {
  climeReferralBadgeSchema,
  type ClimeReferralBadge,
  type ReferralPlacedOn,
} from "./viral-schemas.js";

export const POWERED_BY_WORDMARK = "Powered by CLIME Growth OS" as const;
export const REFERRAL_BASE_URL = "https://clime.growth/r" as const;

/**
 * Opaque referral code — no PII (vg-a badge §3.2).
 */
export function generateReferralCode(seed?: string): string {
  if (seed && seed.trim()) {
    return createHash("sha256").update(seed.trim()).digest("hex").slice(0, 12);
  }
  return randomBytes(6).toString("hex");
}

export function buildReferralUrl(referralCode: string): string {
  const code = referralCode.trim();
  if (!code) throw new Error("referralCode required");
  return `${REFERRAL_BASE_URL}/${encodeURIComponent(code)}`;
}

/**
 * vg-a badge / vg-b — attribution + zero-cost acquisition loop.
 * Not a Capability Matrix badge.
 */
export function buildClimeReferralBadge(input: {
  referralCode?: string;
  projectId?: string;
  placedOn: ReferralPlacedOn;
  locale?: string;
}): ClimeReferralBadge {
  const referralCode =
    input.referralCode?.trim() ||
    generateReferralCode(input.projectId ? `project:${input.projectId}` : undefined);
  const badge = {
    schema_version: 1 as const,
    kind: "clime.referral_badge" as const,
    wordmark: POWERED_BY_WORDMARK,
    referralCode,
    referralUrl: buildReferralUrl(referralCode),
    locale: input.locale,
    placedOn: input.placedOn,
  };
  return climeReferralBadgeSchema.parse(badge);
}

export function formatBadgeFooter(badge: ClimeReferralBadge): string {
  return [
    "—",
    badge.wordmark,
    `Referral: ${badge.referralUrl}`,
    "(Not a Capability Matrix badge — attribution only)",
  ].join("\n");
}
