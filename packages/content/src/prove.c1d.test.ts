/**
 * C1-D Content Prove — Validate skip 0 · Export=backup only · enums 이탈 0
 */
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
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

describe("C1-D Content Prove", () => {
  it("Validate skip = 0 on Optimize and Repurpose", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const engine = createContentEngine(storage);
      const { contentItemId } = await engine.produce({
        projectId: SEED_IDS.emptyProject,
        body: "Draft only — must not optimize or repurpose.",
        traceId: "prove-skip",
      });
      const opt = await engine.optimize({
        contentItemId,
        traceId: "prove-skip-o",
      });
      const rep = await engine.repurpose({
        contentItemId,
        traceId: "prove-skip-r",
      });
      expect(opt.ok).toBe(false);
      expect(rep.ok).toBe(false);
      if (!opt.ok) expect(opt.code).toBe(CONTENT_ERROR_CODES.VALIDATE_REQUIRED);
      if (!rep.ok) expect(rep.code).toBe(CONTENT_ERROR_CODES.VALIDATE_REQUIRED);
    } finally {
      storage.close();
    }
  });

  it("Export = backup only under Exports/YYYY-MM-DD; .clime count = 0; no posted_*", async () => {
    const root = mkdtempSync(join(tmpdir(), "clime-c1d-"));
    tempDirs.push(root);
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const engine = createContentEngine(storage);
      const { contentItemId } = await engine.produce({
        projectId: SEED_IDS.emptyProject,
        title: "Prove",
        body: "Prove export backup separation from viral .clime playbooks.",
        traceId: "prove-ex",
      });
      await engine.validate({ contentItemId, traceId: "prove-ex-v" });
      const pack = await engine.repurpose({
        contentItemId,
        traceId: "prove-ex-r",
      });
      expect(pack.ok).toBe(true);
      if (!pack.ok) throw new Error(pack.message);

      const exported = await engine.exportPack({
        projectId: SEED_IDS.emptyProject,
        contentItemIds: Object.values(pack.channelItemIds),
        exportRoot: root,
        exportDate: "2026-08-07",
        traceId: "prove-ex-w",
      });
      expect(exported.ok).toBe(true);
      if (!exported.ok) throw new Error(exported.message);

      const files = readdirSync(join(root, "Exports", "2026-08-07"));
      expect(files.filter((f) => f.endsWith(".clime"))).toHaveLength(0);
      expect(exported.relativePath.replace(/\\/g, "/")).toMatch(
        /^Exports\/\d{4}-\d{2}-\d{2}$/,
      );

      const history = await engine.listHistory(SEED_IDS.emptyProject, 200);
      const kinds = new Set(history.map((h) => (h as { kind: string }).kind));
      expect(kinds.has("export")).toBe(true);
      expect(kinds.has("posted_api")).toBe(false);
      expect(kinds.has("posted_session")).toBe(false);
    } finally {
      storage.close();
    }
  });

  it("History enums 이탈 = 0", () => {
    expect(PUBLISHING_HISTORY_KINDS).toHaveLength(6);
    expect(parseHistoryKind("export").ok).toBe(true);
    expect(parseHistoryKind("posted").ok).toBe(false);
    expect(parseHistoryKind("clime").ok).toBe(false);
  });

  it("7-channel ids match vg-a §3 freeze", () => {
    expect([...REPURPOSE_CHANNEL_IDS]).toEqual([
      "x_thread",
      "instagram",
      "tiktok",
      "threads",
      "linkedin",
      "youtube_shorts",
      "blog",
    ]);
  });
});
