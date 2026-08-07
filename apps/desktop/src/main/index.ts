import { app, BrowserWindow, ipcMain } from "electron";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { APP_BRAND_NAME, APP_ID } from "../ship/brand.js";
import { bootstrapDesktopDomainApi } from "./bootstrap-domain-api.js";
import { setupAutoUpdater } from "./auto-updater.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Stable folder under %APPDATA% (not npm package name `@clime/desktop`). */
function ensureAppIdentity(): void {
  app.setName(APP_BRAND_NAME);
  app.setAppUserModelId(APP_ID);
  const stableData = join(app.getPath("appData"), "clime-growth-studio");
  mkdirSync(stableData, { recursive: true });
  app.setPath("userData", stableData);
}

function resolveRendererHtml(): string {
  const candidates = [
    join(__dirname, "../renderer/index.html"),
    join(__dirname, "../../dist/renderer/index.html"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    "Renderer missing: run `pnpm --filter @clime/desktop build` (dist/renderer/index.html).",
  );
}

function resolveDbPath(): string {
  const dir = join(app.getPath("userData"), "data");
  mkdirSync(dir, { recursive: true });
  return join(dir, "clime-growth.sqlite");
}

function resolveVaultRoot(): string {
  const dir = join(app.getPath("userData"), "vault");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function createMainWindow(preloadPath?: string, renderUrl?: string): BrowserWindow {
  bootstrapDesktopDomainApi(ipcMain, {
    dbPath: resolveDbPath(),
    vaultRootDir: resolveVaultRoot(),
  });

  const defaultPreload = join(__dirname, "../preload/index.cjs");

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: APP_BRAND_NAME,
    webPreferences: {
      preload: preloadPath ?? defaultPreload,
      contextIsolation: true,
      nodeIntegration: false,
      // Preload is CJS-bundled and needs Node crypto for DomainClient trace ids.
      // Renderer stays isolated (no nodeIntegration).
      sandbox: false,
    },
  });

  if (renderUrl) {
    void win.loadURL(renderUrl);
  } else {
    void win.loadFile(resolveRendererHtml());
  }

  return win;
}

export function startDesktopApp(): Promise<BrowserWindow> {
  ensureAppIdentity();
  return app.whenReady().then(() => {
    setupAutoUpdater();
    const win = createMainWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
    return win;
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

/** Electron entry (`package.json` main) — do not auto-start under Vitest/Node. */
const runningUnderElectron = Boolean(process.versions.electron);
if (runningUnderElectron) {
  void startDesktopApp().catch((err: unknown) => {
    console.error("[clime/desktop] failed to start", err);
    app.exit(1);
  });
}
