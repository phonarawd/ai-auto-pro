/**
 * VG-E Viral Growth Prove — 4 items · badge · .clime · paid API 0 · Export≠유일성공
 */
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createAndSeedSqliteStorage, SEED_IDS } from "@clime/storage";
import { createResearchEngine } from "./engine.js";
import { POWERED_BY_WORDMARK } from "./referral-badge.js";
import {
  MULTI_JACK_FORMAT_IDS,
  microAuditViralExportManifestSchema,
  multiJackVariantPackSchema,
} from "./viral-schemas.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

function listDirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

const FROZEN_7_CHANNELS = [
  "x_thread",
  "instagram",
  "tiktok",
  "threads",
  "linkedin",
  "youtube_shorts",
  "blog",
] as const;

describe("VG-E Viral Growth Prove", () => {
  it("§1 Micro-Audit viral PDF/info + badge/referral; paidApi 0", async () => {
    const root = mkdtempSync(join(tmpdir(), "clime-vge1-"));
    tempDirs.push(root);
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const engine = createResearchEngine(storage);
      await engine.runResearchJob({
        projectId: SEED_IDS.emptyProject,
        traceId: "vge1",
      });
      const audit = await engine.runMicroAudit({
        projectId: SEED_IDS.emptyProject,
        sourceUrl: "https://example.com/public",
      });
      expect(audit.ok).toBe(true);
      if (!audit.ok) return;
      expect(audit.audit.paidApiRequired).toBe(false);

      const viral = await engine.exportMicroAuditViral({
        projectId: SEED_IDS.emptyProject,
        exportRoot: root,
      });
      expect(viral.ok).toBe(true);
      if (!viral.ok) return;
      const manifest = microAuditViralExportManifestSchema.parse(viral.manifest);
      expect(manifest.referralBadge.wordmark).toBe(POWERED_BY_WORDMARK);
      expect(manifest.paidApiRequired).toBe(false);
      expect(manifest.isExportBackup).toBe(false);
      expect(viral.relativePath.startsWith("ViralExports/")).toBe(true);
      expect(viral.relativePath.startsWith("Exports/")).toBe(false);
      expect(readFileSync(viral.pdfPath).subarray(0, 5).toString()).toBe("%PDF-");
    } finally {
      storage.close();
    }
  });

  it("§2 Multi-Jack free_local pack with 4 formats; paidApi 0", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const engine = createResearchEngine(storage);
      await engine.runResearchJob({
        projectId: SEED_IDS.emptyProject,
        traceId: "vge2",
      });
      const trends = await engine.getNormalizedTrends(SEED_IDS.emptyProject);
      const packRes = await engine.buildMultiJackPack({
        projectId: SEED_IDS.emptyProject,
        trendId: trends[0]!.id,
      });
      expect(packRes.ok).toBe(true);
      if (!packRes.ok) return;
      const pack = multiJackVariantPackSchema.parse(packRes.pack);
      expect(pack.budgetClass).toBe("free_local");
      expect(pack.paidApiRequired).toBe(false);
      expect(new Set(pack.variants.map((v) => v.format))).toEqual(
        new Set(MULTI_JACK_FORMAT_IDS),
      );
    } finally {
      storage.close();
    }
  });

  it("§3 7-channel Repurposer freeze still present under content (c1-b)", () => {
    const channelsSrc = readFileSync(
      join(process.cwd(), "../..", "content", "src", "channels.ts"),
      "utf8",
    );
    for (const id of FROZEN_7_CHANNELS) {
      expect(channelsSrc).toContain(`"${id}"`);
    }
    expect(channelsSrc).toMatch(/vg-a §3|C1A §6/);
  });

  it("§4 Export backup path ≠ ViralExports / .clime seats exist", () => {
    expect(existsSync(join(process.cwd(), "src", "micro-audit-export.ts"))).toBe(
      true,
    );
    expect(existsSync(join(process.cwd(), "src", "multi-jack-pack.ts"))).toBe(
      true,
    );
    expect(existsSync(join(process.cwd(), "src", "referral-badge.ts"))).toBe(
      true,
    );
    const playbook = join(
      process.cwd(),
      "../..",
      "workflow",
      "src",
      "clime-playbook.ts",
    );
    expect(existsSync(playbook)).toBe(true);
    const playbookSrc = readFileSync(playbook, "utf8");
    expect(playbookSrc).toContain('kind: z.literal("clime.playbook")');
    expect(playbookSrc).toContain("EXPORT_BACKUP_PATH_FORBIDDEN");

    const exportPack = readFileSync(
      join(process.cwd(), "../..", "content", "src", "export-pack.ts"),
      "utf8",
    );
    expect(exportPack).toContain("Exports");
    expect(exportPack).toContain("EXPORT_CLIME_FORBIDDEN");
  });

  it("meta: no packages/viral god-object; Growth umbrellas stay 5", () => {
    const packagesRoot = join(process.cwd(), "../..");
    expect(existsSync(join(packagesRoot, "viral"))).toBe(false);
    const growthRoot = join(process.cwd(), "..");
    const dirs = listDirs(growthRoot).filter(
      (d) => !d.startsWith(".") && d !== "node_modules",
    );
    for (const d of dirs) {
      expect(
        ["research", "planning", "decision", "revenue", "knowledge"].includes(d),
      ).toBe(true);
    }
  });

  it("meta: research package has no paid vendor / pdfkit deps", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };
    const deps = Object.keys(pkg.dependencies ?? {});
    expect(deps).not.toContain("openai");
    expect(deps).not.toContain("pdfkit");
    expect(deps).not.toContain("@prisma/client");
  });
});
