import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx.js";

export type DataRowProps = {
  label: ReactNode;
  value?: ReactNode;
  trailing?: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">;

export function DataRow({
  label,
  value,
  trailing,
  className,
  style,
  ...rest
}: DataRowProps) {
  const base: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "var(--clime-space-3)",
    minHeight: 32,
    padding: "var(--clime-space-2) 0",
    borderBottom: "1px solid var(--clime-border)",
    fontFamily: "var(--clime-font-sans)",
    fontSize: "var(--clime-text-ui)",
    color: "var(--clime-fg)",
  };

  return (
    <div
      className={cx("clime-data-row", className)}
      data-clime-primitive="DataRow"
      style={{ ...base, ...style }}
      {...rest}
    >
      <div style={{ flex: 1, minWidth: 0, color: "var(--clime-fg-muted)" }}>
        {label}
      </div>
      {value != null ? (
        <div style={{ flex: "0 1 auto", textAlign: "right" }}>{value}</div>
      ) : null}
      {trailing != null ? (
        <div style={{ flex: "0 0 auto" }}>{trailing}</div>
      ) : null}
    </div>
  );
}
