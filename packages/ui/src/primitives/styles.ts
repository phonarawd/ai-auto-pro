import type { CSSProperties } from "react";

/** Shared ops chrome — tokens only (no raw hex). */
export const opsFont: CSSProperties = {
  fontFamily: "var(--clime-font-sans)",
  fontSize: "var(--clime-text-ui)",
  fontWeight: "var(--clime-font-weight-medium)" as unknown as number,
  color: "var(--clime-fg)",
  lineHeight: 1.35,
};

export const focusRing: CSSProperties = {
  outline: "2px solid var(--clime-accent)",
  outlineOffset: "2px",
};

export const hitTargetMin: CSSProperties = {
  minHeight: 28,
  minWidth: 28,
};
