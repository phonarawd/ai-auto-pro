/**
 * Design token values — sole hex / raw value layer for @clime/ui (16 §2.3).
 * Cool neutral ops + single teal-ink accent. Forbidden clichés must not appear.
 */

import type { ClimeTokenName } from "./token-names.js";
import { CLIME_ALL_TOKENS } from "./token-names.js";

/** Cool light slate canvas — not cream (#F4F1EA). */
const BG = "#F1F5F9";
const BG_ELEVATED = "#FFFFFF";
const FG = "#0F172A";
const FG_MUTED = "#64748B";
const BORDER = "#E2E8F0";
/** Operational teal-ink accent (single accent — not purple / terracotta). */
const ACCENT = "#0F766E";
const ACCENT_FG = "#FFFFFF";
const SUCCESS = "#15803D";
const WARNING = "#B45309";
const DANGER = "#B91C1C";
const INFO = "#0369A1";

export const CLIME_TOKEN_VALUES = {
  "--clime-bg": BG,
  "--clime-bg-elevated": BG_ELEVATED,
  "--clime-fg": FG,
  "--clime-fg-muted": FG_MUTED,
  "--clime-border": BORDER,
  "--clime-accent": ACCENT,
  "--clime-accent-fg": ACCENT_FG,
  "--clime-success": SUCCESS,
  "--clime-warning": WARNING,
  "--clime-danger": DANGER,
  "--clime-info": INFO,

  "--clime-font-sans":
    '"Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  "--clime-font-mono":
    '"Pretendard Mono", ui-monospace, "Cascadia Code", Consolas, monospace',

  "--clime-text-display": "30px",
  "--clime-text-title": "19px",
  "--clime-text-body": "14px",
  "--clime-text-ui": "13px",
  "--clime-text-caption": "12px",
  "--clime-text-mono": "12px",

  "--clime-font-weight-regular": "400",
  "--clime-font-weight-medium": "500",
  "--clime-font-weight-semibold": "600",

  "--clime-space-1": "4px",
  "--clime-space-2": "8px",
  "--clime-space-3": "12px",
  "--clime-space-4": "16px",
  "--clime-space-5": "20px",
  "--clime-space-6": "24px",
  "--clime-space-7": "28px",
  "--clime-space-8": "32px",

  "--clime-radius-sm": "4px",
  "--clime-radius-md": "6px",
  "--clime-radius-lg": "8px",

  "--clime-motion-enter": "180ms",
  "--clime-motion-cta": "100ms",
  "--clime-motion-inbox": "180ms",
  "--clime-motion-enter-distance": "6px",
  "--clime-ease-out": "cubic-bezier(0.16, 1, 0.3, 1)",
} as const satisfies Record<ClimeTokenName, string>;

/** Hex values that may exist only in this token definition layer. */
export const CLIME_TOKEN_HEX_ALLOWLIST = [
  BG,
  BG_ELEVATED,
  FG,
  FG_MUTED,
  BORDER,
  ACCENT,
  ACCENT_FG,
  SUCCESS,
  WARNING,
  DANGER,
  INFO,
] as const;

/** Forbidden cliché anchors from 16 §2.2 (must never be token values). */
export const FORBIDDEN_CLICHE_HEX = [
  "#F4F1EA", // warm cream canvas
  "#7C3AED", // purple SaaS
  "#8B5CF6",
  "#6366F1", // indigo
  "#A78BFA",
  "#C2410C", // terracotta-ish
  "#E11D48", // neon-adjacent hot pink red chrome
] as const;

export function assertTokenCoverage(): void {
  for (const name of CLIME_ALL_TOKENS) {
    if (!(name in CLIME_TOKEN_VALUES)) {
      throw new Error(`Missing token value for ${name}`);
    }
  }
}

/** CSS custom-property block for :root (mirrors tokens.css). */
export function getClimeTokensCss(): string {
  const lines = CLIME_ALL_TOKENS.map(
    (name) => `  ${name}: ${CLIME_TOKEN_VALUES[name]};`,
  );
  return `:root {\n${lines.join("\n")}\n}\n`;
}
