import { app } from "electron";
import electronUpdater from "electron-updater";
import { APP_BRAND_NAME } from "../ship/brand.js";

const { autoUpdater } = electronUpdater;

export type AutoUpdaterHooks = {
  onStatus?: (message: string) => void;
  onError?: (error: Error) => void;
};

/**
 * Wire electron-updater for packaged builds only.
 * Dev / vitest: no-op (updater must not touch network or block startup).
 */
export function setupAutoUpdater(hooks: AutoUpdaterHooks = {}): void {
  if (!app.isPackaged) {
    hooks.onStatus?.(`${APP_BRAND_NAME}: auto-updater idle (not packaged)`);
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    hooks.onStatus?.("checking-for-update");
  });
  autoUpdater.on("update-available", () => {
    hooks.onStatus?.("update-available");
  });
  autoUpdater.on("update-not-available", () => {
    hooks.onStatus?.("update-not-available");
  });
  autoUpdater.on("error", (err: Error) => {
    hooks.onError?.(err);
  });
  autoUpdater.on("update-downloaded", () => {
    hooks.onStatus?.("update-downloaded");
  });

  void autoUpdater.checkForUpdatesAndNotify().catch((err: unknown) => {
    const error = err instanceof Error ? err : new Error(String(err));
    hooks.onError?.(error);
  });
}
