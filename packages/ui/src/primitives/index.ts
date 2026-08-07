export { Button, type ButtonProps, type ButtonVariant } from "./Button.js";
export { IconButton, type IconButtonProps } from "./IconButton.js";
export {
  Badge,
  type BadgeProps,
  type BadgeTone,
  type CapabilityField,
} from "./Badge.js";
export { Toolbar, type ToolbarProps } from "./Toolbar.js";
export { Panel, type PanelProps } from "./Panel.js";
export { DataRow, type DataRowProps } from "./DataRow.js";
export { Toast, type ToastProps, type ToastTone } from "./Toast.js";
export {
  CommandPalette,
  type CommandPaletteItem,
  type CommandPaletteProps,
} from "./CommandPalette.js";
export { Card, type CardProps } from "./Card.js";

/** V1 whitelist only (16 §6). New primitives require RFC 16 update first. */
export const CLIME_PRIMITIVE_WHITELIST = [
  "Button",
  "IconButton",
  "Badge",
  "Toolbar",
  "Panel",
  "DataRow",
  "Toast",
  "CommandPalette",
  "Card",
] as const;

export type ClimePrimitiveName = (typeof CLIME_PRIMITIVE_WHITELIST)[number];

/** Explicitly forbidden component names (16 §6.2). */
export const CLIME_FORBIDDEN_PRIMITIVES = [
  "StatCard",
  "PromoChip",
  "HeroOverlay",
  "MetricStrip",
] as const;
