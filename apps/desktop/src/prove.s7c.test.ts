import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { DOMAIN_CLIENT_GLOBAL, setupDesktopPreload } from "./preload/setup-preload.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getAllSourceFiles(dir: string): string[] {
  const files: string[] = [];
  const items = readdirSync(dir);
  for (const item of items) {
    const full = join(dir, item);
    if (statSync(full).isDirectory()) {
      if (!item.includes("__eslint_fixtures__") && item !== "node_modules") {
        files.push(...getAllSourceFiles(full));
      }
    } else if (item.endsWith(".ts") || item.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

describe("7-C Desktop Shell Prove (s7-c)", () => {
  it("preload allowlist: exposes domainClient only on contextBridge (no raw ipcRenderer or bus)", () => {
    const exposed = new Map<string, unknown>();
    const contextBridge = {
      exposeInMainWorld: vi.fn((key: string, api: unknown) => {
        exposed.set(key, api);
      }),
    };
    const ipcRenderer = { invoke: vi.fn() };

    setupDesktopPreload(contextBridge, ipcRenderer);

    expect(contextBridge.exposeInMainWorld).toHaveBeenCalledWith(
      DOMAIN_CLIENT_GLOBAL,
      expect.anything(),
    );

    const client = exposed.get(DOMAIN_CLIENT_GLOBAL) as Record<string, unknown>;
    expect(client).toBeDefined();
    expect(client.ipcRenderer).toBeUndefined();
    expect(client.subscribe).toBeUndefined();
    expect(client.on).toBeUndefined();
    expect(client.growth).toBeDefined();
    expect(client.automation).toBeDefined();
    expect(client.account).toBeDefined();
  });

  it("UI->engine import 0: no renderer source files import vault/event-bus/storage/ai/orm directly", () => {
    const rendererDir = join(__dirname, "renderer");
    const files = getAllSourceFiles(rendererDir);

    const forbiddenRegex = /import\s+.*from\s+["']@clime\/(vault|event-bus|ai|storage|session)["']/g;
    const ormRegex = /import\s+.*from\s+["'](drizzle-orm|better-sqlite3)["']/g;

    for (const filePath of files) {
      const content = readFileSync(filePath, "utf8");
      expect(content, `File ${filePath} contains forbidden engine import`).not.toMatch(forbiddenRegex);
      expect(content, `File ${filePath} contains forbidden ORM import`).not.toMatch(ormRegex);
    }
  });

  it("Tokens & Pretendard font: globals.css imports @clime/ui/tokens.css and specifies Pretendard sans/mono", () => {
    const globalsCssPath = join(__dirname, "renderer/styles/globals.css");
    const content = readFileSync(globalsCssPath, "utf8");

    expect(content).toMatch(/@import "@clime\/ui\/tokens.css";/);
    expect(content).toMatch(/var\(--clime-font-sans\)/);
  });

  it("No raw hex code sprawl in renderer components", () => {
    const componentsDir = join(__dirname, "renderer/components");
    const files = getAllSourceFiles(componentsDir);

    const rawHexRegex = /#(?:[0-9a-fA-F]{3}){1,2}\b/g;

    for (const filePath of files) {
      const content = readFileSync(filePath, "utf8");
      expect(content, `Component ${filePath} contains raw hex color instead of var(--clime-*)`).not.toMatch(rawHexRegex);
    }
  });
});
