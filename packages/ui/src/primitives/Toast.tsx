import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx.js";

export type ToastTone = "info" | "success" | "warning" | "danger";

/**
 * Transient notice — must hand off to Inbox (16 §6).
 * Challenge / captcha / lock must never silently dismiss.
 */
export type ToastProps = {
  children: ReactNode;
  tone?: ToastTone;
  /**
   * Required Inbox handoff: deep-link id or open-Inbox callback contract.
   * Screens must wire this; silent challenge dismiss is forbidden.
   */
  inboxHandoff: { kind: "inbox"; itemId?: string } | { kind: "open-inbox" };
  onOpenInbox?: () => void;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">;

const toneBorder: Record<ToastTone, string> = {
  info: "var(--clime-info)",
  success: "var(--clime-success)",
  warning: "var(--clime-warning)",
  danger: "var(--clime-danger)",
};

export function Toast({
  children,
  tone = "info",
  inboxHandoff,
  onOpenInbox,
  className,
  style,
  ...rest
}: ToastProps) {
  const base: CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: "var(--clime-space-3)",
    padding: "var(--clime-space-3)",
    background: "var(--clime-bg-elevated)",
    border: "1px solid var(--clime-border)",
    borderLeft: `3px solid ${toneBorder[tone]}`,
    borderRadius: "var(--clime-radius-md)",
    fontFamily: "var(--clime-font-sans)",
    fontSize: "var(--clime-text-ui)",
    color: "var(--clime-fg)",
    boxShadow: "none",
    animation: `clime-inbox-arrive var(--clime-motion-inbox) var(--clime-ease-out)`,
  };

  return (
    <div
      role="status"
      className={cx("clime-toast", `clime-toast--${tone}`, className)}
      data-clime-primitive="Toast"
      data-inbox-handoff={inboxHandoff.kind}
      data-inbox-item-id={
        inboxHandoff.kind === "inbox" ? inboxHandoff.itemId : undefined
      }
      style={{ ...base, ...style }}
      {...rest}
    >
      <div style={{ flex: 1 }}>{children}</div>
      {onOpenInbox ? (
        <button
          type="button"
          onClick={onOpenInbox}
          style={{
            fontFamily: "var(--clime-font-sans)",
            fontSize: "var(--clime-text-caption)",
            fontWeight: "var(--clime-font-weight-medium)" as unknown as number,
            color: "var(--clime-accent)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
            minHeight: 28,
          }}
        >
          Inbox
        </button>
      ) : null}
    </div>
  );
}
