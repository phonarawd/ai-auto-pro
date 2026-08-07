import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx.js";

/**
 * Capability honesty fields only (16 §2.4 / Matrix) — do not invent a fourth.
 */
export type CapabilityField = "canPublish" | "publishMode" | "riskLevel";

export type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info";

export type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  /** When set, marks this badge as Capability Matrix truth. */
  capability?: CapabilityField;
} & Omit<HTMLAttributes<HTMLSpanElement>, "children">;

const toneStyle: Record<BadgeTone, CSSProperties> = {
  neutral: {
    background: "var(--clime-bg)",
    color: "var(--clime-fg-muted)",
    borderColor: "var(--clime-border)",
  },
  accent: {
    background: "var(--clime-accent)",
    color: "var(--clime-accent-fg)",
    borderColor: "var(--clime-accent)",
  },
  success: {
    background: "var(--clime-bg-elevated)",
    color: "var(--clime-success)",
    borderColor: "var(--clime-success)",
  },
  warning: {
    background: "var(--clime-bg-elevated)",
    color: "var(--clime-warning)",
    borderColor: "var(--clime-warning)",
  },
  danger: {
    background: "var(--clime-bg-elevated)",
    color: "var(--clime-danger)",
    borderColor: "var(--clime-danger)",
  },
  info: {
    background: "var(--clime-bg-elevated)",
    color: "var(--clime-info)",
    borderColor: "var(--clime-info)",
  },
};

export function Badge({
  children,
  tone = "neutral",
  capability,
  className,
  style,
  ...rest
}: BadgeProps) {
  const base: CSSProperties = {
    ...toneStyle[tone],
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--clime-space-1)",
    fontFamily: "var(--clime-font-sans)",
    fontSize: "var(--clime-text-caption)",
    fontWeight: "var(--clime-font-weight-medium)" as unknown as number,
    lineHeight: 1.2,
    padding: "2px var(--clime-space-2)",
    borderRadius: "var(--clime-radius-sm)",
    borderWidth: 1,
    borderStyle: "solid",
    whiteSpace: "nowrap",
  };

  return (
    <span
      className={cx("clime-badge", `clime-badge--${tone}`, className)}
      data-clime-primitive="Badge"
      data-capability={capability}
      style={{ ...base, ...style }}
      {...rest}
    >
      {children}
    </span>
  );
}
