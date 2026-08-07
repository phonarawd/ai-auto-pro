/**
 * Token name SSOT aligned to docs/architecture/16_DESIGN_SYSTEM.md.
 * Values live in tokens.ts / tokens.css — screens must not invent new --clime-*.
 */

/** §2.4 Core color roles */
export const CLIME_COLOR_TOKENS = [
  "--clime-bg",
  "--clime-bg-elevated",
  "--clime-fg",
  "--clime-fg-muted",
  "--clime-border",
  "--clime-accent",
  "--clime-accent-fg",
  "--clime-success",
  "--clime-warning",
  "--clime-danger",
  "--clime-info",
] as const;

/** §3.1 Fonts */
export const CLIME_FONT_TOKENS = [
  "--clime-font-sans",
  "--clime-font-mono",
] as const;

/** §3.2 Type scale */
export const CLIME_TEXT_TOKENS = [
  "--clime-text-display",
  "--clime-text-title",
  "--clime-text-body",
  "--clime-text-ui",
  "--clime-text-caption",
  "--clime-text-mono",
] as const;

/** §3 companion weights (desktop-first scale) */
export const CLIME_WEIGHT_TOKENS = [
  "--clime-font-weight-regular",
  "--clime-font-weight-medium",
  "--clime-font-weight-semibold",
] as const;

/** §4 Spacing — 4-based: space-1…8 (4→32px) */
export const CLIME_SPACE_TOKENS = [
  "--clime-space-1",
  "--clime-space-2",
  "--clime-space-3",
  "--clime-space-4",
  "--clime-space-5",
  "--clime-space-6",
  "--clime-space-7",
  "--clime-space-8",
] as const;

/** §2.3 Radius (ops, not pill chrome) */
export const CLIME_RADIUS_TOKENS = [
  "--clime-radius-sm",
  "--clime-radius-md",
  "--clime-radius-lg",
] as const;

/** §5 Motion budget */
export const CLIME_MOTION_TOKENS = [
  "--clime-motion-enter",
  "--clime-motion-cta",
  "--clime-motion-inbox",
  "--clime-motion-enter-distance",
  "--clime-ease-out",
] as const;

export const CLIME_ALL_TOKENS = [
  ...CLIME_COLOR_TOKENS,
  ...CLIME_FONT_TOKENS,
  ...CLIME_TEXT_TOKENS,
  ...CLIME_WEIGHT_TOKENS,
  ...CLIME_SPACE_TOKENS,
  ...CLIME_RADIUS_TOKENS,
  ...CLIME_MOTION_TOKENS,
] as const;

export type ClimeTokenName = (typeof CLIME_ALL_TOKENS)[number];
