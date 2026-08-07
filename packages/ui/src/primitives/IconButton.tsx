import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { cx } from "../lib/cx.js";
import { hitTargetMin, opsFont } from "./styles.js";

export type IconButtonProps = {
  label: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label">;

export function IconButton({
  label,
  children,
  className,
  style,
  type = "button",
  disabled,
  ...rest
}: IconButtonProps) {
  const base: CSSProperties = {
    ...opsFont,
    ...hitTargetMin,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "var(--clime-space-1)",
    borderRadius: "var(--clime-radius-md)",
    border: "1px solid var(--clime-border)",
    background: "var(--clime-bg-elevated)",
    color: "var(--clime-fg)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: `transform var(--clime-motion-cta) var(--clime-ease-out)`,
  };

  return (
    <button
      type={type}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cx("clime-icon-btn", className)}
      data-clime-primitive="IconButton"
      style={{ ...base, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
