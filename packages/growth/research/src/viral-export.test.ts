import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSqliteStorage } from "@clime/storage";
import { createResearchEngine } from "./engine.js";
import {
  POWERED_BY_WORDMARK,
  buildClimeReferralBadge,
} from "./referral-badge.js";
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

describe("VG-B Micro-Audit viral export", () => {
  it("writes PDF + infographic with Powered-by badge + referral; not Export backup", async () => {
    const root = mkdtempSync(join(tmpdir(), "clime-vgb-"));
    tempDirs.push(root);
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "VG-B" });
      const engine = createResearchEngine(storage);
      await engine.runResearchJob({ projectId, traceId: "tr_vgb" });
      const auditRes = await engine.runMicroAudit({
        projectId,
        sourceUrl: "https://example.com/public-feed",
      });
      expect(auditRes.ok).toBe(true);

      const exported = await engine.exportMicroAuditViral({
        projectId,
        exportRoot: root,
        referralCode: "ref_test_01",
      });
      expect(exported.ok).toBe(true);
      if (!exported.ok) return;

      expect(exported.relativePath.startsWith("ViralExports/")).toBe(true);
      expect(exported.relativePath.startsWith("Exports/")).toBe(false);
      expect(existsSync(exported.pdfPath)).toBe(true);
      expect(existsSync(exported.infographicPath)).toBe(true);
      expect(readFileSync(exported.pdfPath).subarray(0, 5).toString()).toBe(
        "%PDF-",
      );

      const manifest = microAuditViralExportManifestSchema.parse(
        exported.manifest,
      );
      expect(manifest.kind).toBe("growth.micro_audit_viral_export");
      expect(manifest.isExportBackup).toBe(false);
      expect(manifest.paidApiRequired).toBe(false);
      expect(manifest.referralBadge.wordmark).toBe(POWERED_BY_WORDMARK);
      expect(manifest.referralBadge.referralUrl).toContain("ref_test_01");
      expect(manifest.referralBadge.placedOn).toBe("micro_audit_export");

      const info = readFileSync(exported.infographicPath, "utf8");
      expect(info).toContain(POWERED_BY_WORDMARK);
      expect(info).toContain("https://clime.growth/r/");
      expect(exported.files.some((f) => f.endsWith(".clime"))).toBe(false);
    } finally {
      storage.close();
    }
  });

  it("referral badge Zod rejects non-https URL", () => {
    expect(() =>
      buildClimeReferralBadge({
        referralCode: "x",
        placedOn: "micro_audit_export",
      }),
    ).not.toThrow();
  });
});

describe("VG-C Trend Multi-Jack variant pack", () => {
  it("expands hot topic into meme/card_news/shorts/threads with free_local", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "VG-C" });
      const engine = createResearchEngine(storage);
      await engine.runResearchJob({ projectId, traceId: "tr_vgc" });
      const trends = await engine.getNormalizedTrends(projectId);
      expect(trends.length).toBeGreaterThan(0);

      const packRes = await engine.buildMultiJackPack({
        projectId,
        trendId: trends[0]!.id,
        personaHints: ["ops_lead"],
      });
      expect(packRes.ok).toBe(true);
      if (!packRes.ok) return;

      const pack = multiJackVariantPackSchema.parse(packRes.pack);
      expect(pack.kind).toBe("growth.multi_jack_variant_pack");
      expect(pack.budgetClass).toBe("free_local");
      expect(pack.paidApiRequired).toBe(false);
      const formats = new Set(pack.variants.map((v) => v.format));
      for (const id of MULTI_JACK_FORMAT_IDS) {
        expect(formats.has(id)).toBe(true);
      }
      expect(pack.variants.every((v) => v.body.length > 0)).toBe(true);
    } finally {
      storage.close();
    }
  });
});
