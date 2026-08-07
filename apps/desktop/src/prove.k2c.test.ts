import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  APP_BRAND_NAME,
  APP_ID,
  WINDOWS_EXE_NAME,
} from "./ship/brand.js";

const here = dirname(fileURLToPath(import.meta.url));
const desktopRoot = join(here, "..");
const repoRoot = join(desktopRoot, "..", "..");

describe("K2-C Ship Prove — installer · updater · brand · DoD", () => {
  it("brand SSOT matches CLIME AI Growth Studio.exe", () => {
    expect(APP_BRAND_NAME).toBe("CLIME AI Growth Studio");
    expect(WINDOWS_EXE_NAME).toBe("CLIME AI Growth Studio.exe");
    expect(APP_ID).toBe("com.clime.growth-studio");
  });

  it("electron-builder.yml: productName, artifactName, publish, appId", () => {
    const yml = readFileSync(join(desktopRoot, "electron-builder.yml"), "utf8");
    expect(yml).toMatch(/productName:\s*CLIME AI Growth Studio/);
    expect(yml).toMatch(/appId:\s*com\.clime\.growth-studio/);
    expect(yml).toMatch(/artifactName:\s*\$\{productName\}\.\$\{ext\}/);
    expect(yml).toMatch(/^publish:/m);
    expect(yml).toMatch(/provider:\s*generic/);
    expect(yml).toMatch(/signAndEditExecutable:\s*false/);
  });

  it("package.json wires electron-builder + electron-updater + main entry + pack scripts", () => {
    const pkg = JSON.parse(
      readFileSync(join(desktopRoot, "package.json"), "utf8"),
    ) as {
      main?: string;
      description?: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      scripts?: Record<string, string>;
    };
    expect(pkg.main).toBe("dist/main/index.js");
    expect(pkg.description).toMatch(/CLIME AI Growth Studio/);
    expect(pkg.dependencies?.["electron-updater"]).toBeTruthy();
    expect(pkg.devDependencies?.["electron-builder"]).toBeTruthy();
    expect(pkg.scripts?.pack).toMatch(/electron-builder/);
    expect(pkg.scripts?.["dist:win"]).toMatch(/electron-builder/);
    expect(pkg.scripts?.["ship:smoke"]).toBeTruthy();
  });

  it("main wires setupAutoUpdater; updater gates on isPackaged", () => {
    const main = readFileSync(join(here, "main/index.ts"), "utf8");
    const updater = readFileSync(join(here, "main/auto-updater.ts"), "utf8");
    expect(main).toMatch(/setupAutoUpdater/);
    expect(main).toMatch(/APP_BRAND_NAME/);
    expect(updater).toMatch(/from ["']electron-updater["']/);
    expect(updater).toMatch(/app\.isPackaged/);
    expect(updater).toMatch(/checkForUpdatesAndNotify/);
  });

  it("ship docs: installer path · code-sign aware · disk ≥20GB · updater", () => {
    const ship = readFileSync(join(repoRoot, "docs/setup/06_SHIP.md"), "utf8");
    expect(ship).toMatch(/CLIME AI Growth Studio\.exe/);
    expect(ship).toMatch(/electron-updater/);
    expect(ship).toMatch(/20\s*GB|≥ 20|>= 20/);
    expect(ship).toMatch(/Code signing|코드서명|code-sign/i);
    expect(ship).toMatch(/CSC_LINK/);
    expect(ship).toMatch(/win-unpacked/);
    expect(ship).toMatch(/signAndEditExecutable/);

    const operate = readFileSync(
      join(repoRoot, "docs/setup/04_HOW_TO_OPERATE.md"),
      "utf8",
    );
    expect(operate).toMatch(/06_SHIP\.md|Ship smoke|ship-smoke/);
    expect(operate).toMatch(/20\s*GB|≥20|>= 20/);

    expect(existsSync(join(repoRoot, "scripts/ship-smoke.ps1"))).toBe(true);
    const smoke = readFileSync(join(repoRoot, "scripts/ship-smoke.ps1"), "utf8");
    expect(smoke).toMatch(/\$minFreeGb\s*=\s*20/);
    expect(smoke).toMatch(/CLIME AI Growth Studio\.exe/);
    expect(smoke).toMatch(/npm rebuild better-sqlite3/);
  });

  it("V1 DoD deploy items covered in 06_SHIP + prove appendix path", () => {
    const ship = readFileSync(join(repoRoot, "docs/setup/06_SHIP.md"), "utf8");
    expect(ship).toMatch(/V1 DoD deploy/);
    expect(ship).toMatch(/electron-builder \+ electron-updater/);
    expect(ship).toMatch(/Code-signing awareness/);
    expect(ship).toMatch(/Disk ≥20/);

    const provePath = join(repoRoot, "docs/appendix/K2C_SHIP_PROVE.md");
    expect(existsSync(provePath)).toBe(true);
    const prove = readFileSync(provePath, "utf8");
    expect(prove).toMatch(/\*\*Status:\*\*\s*GREEN/);
    expect(prove).toMatch(/k2-c/);
    expect(prove).toMatch(/CLIME AI Growth Studio/);
  });
});
