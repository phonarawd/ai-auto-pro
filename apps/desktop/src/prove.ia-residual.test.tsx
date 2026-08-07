/**
 * V1 residual IA surfaces + @clime/tool close-out prove.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");

const REQUIRED_SURFACES = [
  "Projects",
  "AccountManager",
  "ToolsBrowserProfiles",
  "Content",
  "MissionTemplates",
  "QueueCalendarKeywords",
  "Analytics",
  "ExportBackup",
];

describe("V1 residual IA + tool close-out", () => {
  it("packages/tool exists as lean FS/OCR/profile home (no Playwright)", () => {
    const pkgPath = join(repoRoot, "packages/tool/package.json");
    expect(existsSync(pkgPath)).toBe(true);
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      name: string;
      dependencies?: Record<string, string>;
    };
    expect(pkg.name).toBe("@clime/tool");
    expect(Object.keys(pkg.dependencies ?? {})).not.toContain("playwright");

    const api = readFileSync(join(repoRoot, "packages/tool/src/api.ts"), "utf8");
    expect(api).toMatch(/tool\.listProfiles/);
    expect(api).toMatch(/tool\.runOcr/);
  });

  it("desktop wires tool handlers in Domain API host", () => {
    const boot = readFileSync(
      join(repoRoot, "apps/desktop/src/main/bootstrap-domain-api.ts"),
      "utf8",
    );
    expect(boot).toMatch(/@clime\/tool/);
    expect(boot).toMatch(/tool\.listProfiles/);
    expect(boot).toMatch(/createToolEngine/);
  });

  it("IaSurfaces covers all residual IA checklist surfaces", () => {
    const src = readFileSync(
      join(repoRoot, "apps/desktop/src/renderer/components/IaSurfaces.tsx"),
      "utf8",
    );
    for (const surface of REQUIRED_SURFACES) {
      expect(src, surface).toMatch(new RegExp(`data-clime-surface|${surface}`));
      expect(src).toContain(surface);
    }
    expect(src).not.toMatch(/from\s+["']@clime\/(tool|storage|account)["']/);
  });

  it("Mission Center exposes menu + Quick Actions for residual surfaces", () => {
    const src = readFileSync(
      join(repoRoot, "apps/desktop/src/renderer/components/MissionCenterFrame.tsx"),
      "utf8",
    );
    expect(src).toMatch(/IaSurfaces/);
    expect(src).toMatch(/setIaSurface\("projects"\)/);
    expect(src).toMatch(/COPY\.surfaces\.account|계정 연결/);
    expect(src).toMatch(/COPY\.surfaces\.queue|대기줄/);
    expect(src).toMatch(/COPY\.surfaces\.export|파일로 보관/);
  });
});
