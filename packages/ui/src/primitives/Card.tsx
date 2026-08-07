import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx.js";

/**
 * Card policy (16 §6.1): allowed **only** as a user-interaction container.
 * Not a default layout unit. Never use in Mission Center hero / first viewport.
 *
 * `interactive: true` is required at the type level — decorative Card usage is a type error.
 */
export type CardProps = {
  /** Must be literal `true` — interaction container only. */
  interactive: true;
  children: ReactNode;
  /** Describes the interaction (e.g. "Select plan", "Confirm publish"). */
  interactionLabel: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">;

export function Card({
  interactive,
  interactionLabel,
  children,
  className,
  style,
  ...rest
}: CardProps) {
  if (interactive !== true) {
    throw new Error(
      "Card may only be used as an interaction container (16 §6.1). Use Panel/DataRow for layout.",
    );
  }

  const base: CSSProperties = {
    background: "var(--clime-bg-elevated)",
    border: "1px solid var(--clime-border)",
    borderRadius: "var(--clime-radius-md)",
    padding: "var(--clime-space-4)",
    fontFamily: "var(--clime-font-sans)",
    fontSize: "var(--clime-text-body)",
    color: "var(--clime-fg)",
    cursor: "pointer",
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={interactionLabel}
      className={cx("clime-card", "clime-card--interactive", className)}
      data-clime-primitive="Card"
      data-clime-card-policy="interaction-only"
      style={{ ...base, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
