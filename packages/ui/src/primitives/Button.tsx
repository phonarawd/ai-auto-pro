import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { cx } from "../lib/cx.js";
import { hitTargetMin, opsFont } from "./styles.js";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export type ButtonProps = {
  variant?: ButtonVariant;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

const variantStyle: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: "var(--clime-accent)",
    color: "var(--clime-accent-fg)",
    border: "1px solid var(--clime-accent)",
  },
  secondary: {
    background: "var(--clime-bg-elevated)",
    color: "var(--clime-fg)",
    border: "1px solid var(--clime-border)",
  },
  danger: {
    background: "var(--clime-danger)",
    color: "var(--clime-accent-fg)",
    border: "1px solid var(--clime-danger)",
  },
  ghost: {
    background: "transparent",
    color: "var(--clime-fg)",
    border: "1px solid transparent",
  },
};

export function Button({
  variant = "primary",
  children,
  className,
  style,
  type = "button",
  disabled,
  ...rest
}: ButtonProps) {
  const base: CSSProperties = {
    ...opsFont,
    ...hitTargetMin,
    ...variantStyle[variant],
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--clime-space-2)",
    padding: "0 var(--clime-space-3)",
    borderRadius: "var(--clime-radius-md)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: `transform var(--clime-motion-cta) var(--clime-ease-out), opacity var(--clime-motion-cta) var(--clime-ease-out)`,
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={cx("clime-btn", `clime-btn--${variant}`, className)}
      data-clime-primitive="Button"
      style={{ ...base, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
