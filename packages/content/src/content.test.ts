import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createAndSeedSqliteStorage,
  SEED_IDS,
} from "@clime/storage";
import {
  CONTENT_ERROR_CODES,
  createContentEngine,
  parseHistoryKind,
  PUBLISHING_HISTORY_KINDS,
  REPURPOSE_CHANNEL_IDS,
} from "./index.js";

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

describe("@clime/content Produce → Validate → Optimize/Repurpose", () => {
  it("Produce creates draft + history kind=draft", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const engine = createContentEngine(storage);
      const produced = await engine.produce({
        projectId: SEED_IDS.emptyProject,
        body: "A solid growth tip about local-first ops.",
        title: "Local-first",
        prompt: "Write a tip",
        traceId: "tr-produce-1",
      });
      expect(produced.status).toBe("draft");
      const art = await engine.getArtifact(produced.contentItemId);
      expect(art).toMatchObject({ status: "draft" });
      const history = await engine.listHistory(SEED_IDS.emptyProject, 10);
      expect(history.some((h) => (h as { kind: string }).kind === "draft")).toBe(
        true,
      );
    } finally {
      storage.close();
    }
  });

  it("Optimize/Repurpose on draft → VALIDATE_REQUIRED (Validate skip = 0)", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const engine = createContentEngine(storage);
      const produced = await engine.produce({
        projectId: SEED_IDS.emptyProject,
        body: "Skip validate attempt body with enough length for later.",
        traceId: "tr-skip-1",
      });

      const opt = await engine.optimize({
        contentItemId: produced.contentItemId,
        traceId: "tr-skip-opt",
      });
      expect(opt.ok).toBe(false);
      if (!opt.ok) {
        expect(opt.code).toBe(CONTENT_ERROR_CODES.VALIDATE_REQUIRED);
      }

      const rep = await engine.repurpose({
        contentItemId: produced.contentItemId,
        traceId: "tr-skip-rep",
      });
      expect(rep.ok).toBe(false);
      if (!rep.ok) {
        expect(rep.code).toBe(CONTENT_ERROR_CODES.VALIDATE_REQUIRED);
      }
    } finally {
      storage.close();
    }
  });

  it("Validate pass then Optimize succeeds", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const engine = createContentEngine(storage);
      const produced = await engine.produce({
        projectId: SEED_IDS.emptyProject,
        body: "Validated content ready for an optimize pass with enough chars.",
        title: "Optimize me",
        traceId: "tr-opt-1",
      });
      const v = await engine.validate({
        contentItemId: produced.contentItemId,
        traceId: "tr-opt-v",
      });
      expect(v.valid).toBe(true);
      expect(v.status).toBe("validated");

      const opt = await engine.optimize({
        contentItemId: produced.contentItemId,
        traceId: "tr-opt-2",
      });
      expect(opt.ok).toBe(true);
      if (opt.ok) {
        expect(["optimized", "ready"]).toContain(opt.status);
      }
    } finally {
      storage.close();
    }
  });

  it("Validate rejects forbidden earnings phrases", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const engine = createContentEngine(storage);
      const produced = await engine.produce({
        projectId: SEED_IDS.emptyProject,
        body: "This is a guaranteed profit scheme — do not ship.",
        traceId: "tr-forbid-1",
      });
      const v = await engine.validate({
        contentItemId: produced.contentItemId,
        traceId: "tr-forbid-v",
      });
      expect(v.valid).toBe(false);
      expect(v.status).toBe("failed_validation");
    } finally {
      storage.close();
    }
  });

  it("Brand rules from loader fail off-brand / missing required (Phase F)", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const engine = createContentEngine(storage, {
        loadBrandRules: async () => ({
          forbiddenPhrases: ["완전 자동"],
          offBrandPhrases: ["spam botnet"],
          requiredPhrases: ["CLIME"],
          tone: "ops",
        }),
      });

      const bad = await engine.produce({
        projectId: SEED_IDS.emptyProject,
        body: "This mentions spam botnet and has no brand marker.",
        traceId: "tr-brand-bad",
      });
      const badV = await engine.validate({
        contentItemId: bad.contentItemId,
        traceId: "tr-brand-bad-v",
      });
      expect(badV.valid).toBe(false);
      expect(badV.checks?.brand).toBe("fail");
      expect(badV.errors?.some((e) => /CLIME답지 않음|required phrase/i.test(e))).toBe(
        true,
      );

      const good = await engine.produce({
        projectId: SEED_IDS.emptyProject,
        body: "CLIME ops tip: measure then learn with honest Capability Matrix.",
        traceId: "tr-brand-good",
      });
      const goodV = await engine.validate({
        contentItemId: good.contentItemId,
        traceId: "tr-brand-good-v",
      });
      expect(goodV.valid).toBe(true);
      expect(goodV.checks?.brand).toBe("pass");
    } finally {
      storage.close();
    }
  });

  it("Brand absent → brand check skip", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const engine = createContentEngine(storage);
      const produced = await engine.produce({
        projectId: SEED_IDS.emptyProject,
        body: "Plain tip without brand profile loaded.",
        traceId: "tr-brand-skip",
      });
      const v = await engine.validate({
        contentItemId: produced.contentItemId,
        traceId: "tr-brand-skip-v",
      });
      expect(v.valid).toBe(true);
      expect(v.checks?.brand).toBe("skip");
      expect(v.checks?.brand_stub).toBe("skip");
    } finally {
      storage.close();
    }
  });

  it("Repurpose produces all 7 channels and validates each", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const engine = createContentEngine(storage);
      const produced = await engine.produce({
        projectId: SEED_IDS.emptyProject,
        title: "Seven channels",
        body: "One source artifact becomes seven channel packs for zero-cost viral growth.",
        prompt: "Repurpose this",
        hashtags: ["CLIME"],
        traceId: "tr-rep-1",
      });
      await engine.validate({
        contentItemId: produced.contentItemId,
        traceId: "tr-rep-v",
      });
      const pack = await engine.repurpose({
        contentItemId: produced.contentItemId,
        traceId: "tr-rep-2",
      });
      expect(pack.ok).toBe(true);
      if (!pack.ok) throw new Error(pack.message);
      expect(Object.keys(pack.channelItemIds).sort()).toEqual(
        [...REPURPOSE_CHANNEL_IDS].sort(),
      );
      for (const id of REPURPOSE_CHANNEL_IDS) {
        const art = (await engine.getArtifact(pack.channelItemIds[id])) as {
          status: string;
          channel: string;
        };
        expect(art.channel).toBe(id);
        expect(art.status).toBe("validated");
      }
    } finally {
      storage.close();
    }
  });
});

describe("@clime/content Export backup + History enums", () => {
  it("exportPack writes Exports/YYYY-MM-DD/ only; no .clime; history kind=export", async () => {
    const root = mkdtempSync(join(tmpdir(), "clime-export-"));
    tempDirs.push(root);
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const engine = createContentEngine(storage);
      const produced = await engine.produce({
        projectId: SEED_IDS.emptyProject,
        title: "Export tip",
        body: "Backup log content for dated export folder.",
        prompt: "export prompt",
        hashtags: ["backup"],
        channel: "blog",
        format: "longform",
        traceId: "tr-ex-1",
      });
      await engine.validate({
        contentItemId: produced.contentItemId,
        traceId: "tr-ex-v",
      });
      const pack = await engine.repurpose({
        contentItemId: produced.contentItemId,
        traceId: "tr-ex-rep",
      });
      expect(pack.ok).toBe(true);
      if (!pack.ok) throw new Error(pack.message);

      const ids = Object.values(pack.channelItemIds);
      const exported = await engine.exportPack({
        projectId: SEED_IDS.emptyProject,
        contentItemIds: ids,
        exportRoot: root,
        exportDate: "2026-08-07",
        packId: pack.packId,
        traceId: "tr-ex-2",
      });
      expect(exported.ok).toBe(true);
      if (!exported.ok) throw new Error(exported.message);
      expect(exported.relativePath.replace(/\\/g, "/")).toBe(
        "Exports/2026-08-07",
      );

      const dir = join(root, "Exports", "2026-08-07");
      const files = readdirSync(dir);
      expect(files).toContain("manifest.json");
      expect(files).toContain("accounts.json");
      expect(files).toContain("Prompt.txt");
      expect(files.some((f) => f.endsWith(".clime"))).toBe(false);

      const manifest = JSON.parse(
        readFileSync(join(dir, "manifest.json"), "utf8"),
      ) as { kind: string; schema_version: number };
      expect(manifest.kind).toBe("content.export_backup");
      expect(manifest.schema_version).toBe(1);

      const history = await engine.listHistory(SEED_IDS.emptyProject, 100);
      const exportEvents = history.filter(
        (h) => (h as { kind: string }).kind === "export",
      );
      expect(exportEvents.length).toBeGreaterThanOrEqual(7);
      for (const ev of exportEvents) {
        expect((ev as { publishMode: string | null }).publishMode).toBeNull();
        expect((ev as { kind: string }).kind).toBe("export");
      }
      expect(
        history.some((h) =>
          ["posted_api", "posted_session", "posted_manual"].includes(
            (h as { kind: string }).kind,
          ),
        ),
      ).toBe(false);
    } finally {
      storage.close();
    }
  });

  it("History enums: frozen set accepted; unknown rejected", () => {
    expect(PUBLISHING_HISTORY_KINDS).toEqual([
      "draft",
      "export",
      "scheduled",
      "posted_manual",
      "posted_api",
      "posted_session",
    ]);
    for (const kind of PUBLISHING_HISTORY_KINDS) {
      expect(parseHistoryKind(kind).ok).toBe(true);
    }
    const bad = parseHistoryKind("posted");
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.code).toBe(CONTENT_ERROR_CODES.INVALID_HISTORY_KIND);
    }
    expect(parseHistoryKind("clime_playbook").ok).toBe(false);
  });

  it("appendHistorySafe rejects unknown kinds (enums 이탈 0)", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const engine = createContentEngine(storage);
      const rejected = await engine.appendHistorySafe({
        projectId: SEED_IDS.emptyProject,
        kind: "viral_share",
      });
      expect(rejected.ok).toBe(false);
    } finally {
      storage.close();
    }
  });
});
