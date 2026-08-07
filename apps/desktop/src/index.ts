import { SCHEMA_VERSION } from "@clime/shared";
import { APP_BRAND_NAME } from "./ship/brand.js";

/** Desktop shell — Electron main + preload + Next renderer. */
export function desktopBootstrapBanner(): string {
  return `${APP_BRAND_NAME} (schema_version=${SCHEMA_VERSION})`;
}

export {
  APP_ARCHITECTURE_NAME,
  APP_BRAND_NAME,
  APP_ID,
  WINDOWS_EXE_NAME,
} from "./ship/brand.js";
export { bootstrapDesktopDomainApi } from "./main/bootstrap-domain-api.js";
export { createMainWindow, startDesktopApp } from "./main/index.js";
export { setupAutoUpdater } from "./main/auto-updater.js";
export { setupDesktopPreload, DOMAIN_CLIENT_GLOBAL } from "./preload/setup-preload.js";
export { MissionCenterFrame } from "./renderer/index.js";
