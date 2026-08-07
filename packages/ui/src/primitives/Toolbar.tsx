import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx.js";

export type ToolbarProps = {
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">;

export function Toolbar({ children, className, style, ...rest }: ToolbarProps) {
  const base: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "var(--clime-space-2)",
    padding: "var(--clime-space-2) var(--clime-space-3)",
    background: "var(--clime-bg-elevated)",
    borderBottom: "1px solid var(--clime-border)",
    fontFamily: "var(--clime-font-sans)",
    fontSize: "var(--clime-text-ui)",
    color: "var(--clime-fg)",
  };

  return (
    <div
      role="toolbar"
      className={cx("clime-toolbar", className)}
      data-clime-primitive="Toolbar"
      style={{ ...base, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
