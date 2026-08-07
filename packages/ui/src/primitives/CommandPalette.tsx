import type {
  CSSProperties,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { cx } from "../lib/cx.js";

export type CommandPaletteItem = {
  id: string;
  label: string;
  hint?: string;
  onSelect?: () => void;
};

export type CommandPaletteProps = {
  open: boolean;
  title?: string;
  query: string;
  onQueryChange: (query: string) => void;
  items: CommandPaletteItem[];
  onClose?: () => void;
  inputProps?: Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange"
  >;
  emptyLabel?: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "children" | "title">;

/**
 * Global Quick Actions surface (Raycast-like). Elevation allowed for this chrome.
 */
export function CommandPalette({
  open,
  title = "Quick Actions",
  query,
  onQueryChange,
  items,
  onClose,
  inputProps,
  emptyLabel = "No actions",
  className,
  style,
  ...rest
}: CommandPaletteProps) {
  if (!open) return null;

  const shell: CSSProperties = {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: "12vh",
    background: "color-mix(in srgb, var(--clime-fg) 28%, transparent)",
    zIndex: 1000,
  };

  const panel: CSSProperties = {
    width: "min(560px, calc(100vw - 32px))",
    background: "var(--clime-bg-elevated)",
    border: "1px solid var(--clime-border)",
    borderRadius: "var(--clime-radius-lg)",
    overflow: "hidden",
    fontFamily: "var(--clime-font-sans)",
    color: "var(--clime-fg)",
    animation: `clime-enter var(--clime-motion-enter) var(--clime-ease-out)`,
  };

  return (
    <div
      className={cx("clime-command-palette", className)}
      data-clime-primitive="CommandPalette"
      role="presentation"
      style={{ ...shell, ...style }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      {...rest}
    >
      <div role="dialog" aria-modal="true" aria-label={title} style={panel}>
        <div
          style={{
            padding: "var(--clime-space-3)",
            borderBottom: "1px solid var(--clime-border)",
          }}
        >
          <input
            {...inputProps}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={inputProps?.placeholder ?? "Type a command…"}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: "var(--clime-font-sans)",
              fontSize: "var(--clime-text-body)",
              color: "var(--clime-fg)",
              minHeight: 28,
            }}
          />
        </div>
        <ul
          role="listbox"
          style={{
            listStyle: "none",
            margin: 0,
            padding: "var(--clime-space-2)",
            maxHeight: 320,
            overflow: "auto",
          }}
        >
          {items.length === 0 ? (
            <li
              style={{
                padding: "var(--clime-space-3)",
                color: "var(--clime-fg-muted)",
                fontSize: "var(--clime-text-ui)",
              }}
            >
              {emptyLabel}
            </li>
          ) : (
            items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  onClick={() => item.onSelect?.()}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "var(--clime-space-3)",
                    textAlign: "left",
                    padding: "var(--clime-space-2) var(--clime-space-3)",
                    border: "none",
                    borderRadius: "var(--clime-radius-sm)",
                    background: "transparent",
                    color: "var(--clime-fg)",
                    fontFamily: "var(--clime-font-sans)",
                    fontSize: "var(--clime-text-ui)",
                    cursor: "pointer",
                    minHeight: 28,
                  }}
                >
                  <span>{item.label}</span>
                  {item.hint ? (
                    <span style={{ color: "var(--clime-fg-muted)" }}>
                      {item.hint}
                    </span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
