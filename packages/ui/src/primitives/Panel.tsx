import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx.js";

/**
 * Ops surface container — flat panel with quiet border (not a marketing card).
 */
export type PanelProps = {
  children: ReactNode;
  elevated?: boolean;
} & Omit<HTMLAttributes<HTMLElement>, "children">;

export function Panel({
  children,
  elevated = false,
  className,
  style,
  ...rest
}: PanelProps) {
  const base: CSSProperties = {
    background: elevated
      ? "var(--clime-bg-elevated)"
      : "var(--clime-bg)",
    border: "1px solid var(--clime-border)",
    borderRadius: "var(--clime-radius-md)",
    padding: "var(--clime-space-4)",
    fontFamily: "var(--clime-font-sans)",
    fontSize: "var(--clime-text-body)",
    color: "var(--clime-fg)",
  };

  return (
    <section
      className={cx("clime-panel", elevated && "clime-panel--elevated", className)}
      data-clime-primitive="Panel"
      style={{ ...base, ...style }}
      {...rest}
    >
      {children}
    </section>
  );
}
