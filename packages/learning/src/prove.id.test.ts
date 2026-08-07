import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createMemoryEngine } from "@clime/memory";
import { createSqliteStorage } from "@clime/storage";
import { CONFIDENCE_AUTO_PROMOTE_THRESHOLD, canAutoPromote } from "./confidence.js";
import { createLearningEngine } from "./engine.js";

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTsFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

describe("I-D Learn Prove — Meta pollution 0 · Confidence 미달 promote 0", () => {
  it("Confidence threshold is 0.91; canAutoPromote matches gate", () => {
    expect(CONFIDENCE_AUTO_PROMOTE_THRESHOLD).toBe(0.91);
    expect(canAutoPromote(0.9)).toBe(false);
    expect(canAutoPromote(0.91)).toBe(true);
    expect(canAutoPromote(0.31)).toBe(false);
  });

  it("confidence < 0.91 → promote to active = 0", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "prove-i" });
      const memory = createMemoryEngine(storage);
      const learning = createLearningEngine(storage);

      for (const conf of [0, 0.31, 0.5, 0.9, 0.909]) {
        const result = await learning.proposeFromRoi({
          memory,
          snapshot: {
            schema_version: 1,
            kind: "learning.roi_snapshot",
            id: `roi_${conf}`,
            projectId,
            measuredRoi: 1,
            isEstimate: false,
            confidence: conf,
            summary: `conf ${conf}`,
            measuredAt: new Date().toISOString(),
          },
        });
        expect(result.autoPromoted).toBe(false);
        expect(result.status).toBe("suggested");
      }

      const policies = await learning.listPolicies(projectId);
      const active = policies.filter((p) => p.status === "active");
      expect(active).toHaveLength(0);
    } finally {
      storage.close();
    }
  });

  it("Meta pollution 0 — no @clime/meta, no Goal/Decision writes in learning src", () => {
    const root = join(process.cwd(), "src");
    for (const file of listTsFiles(root)) {
      if (file.endsWith(".test.ts")) continue;
      const src = readFileSync(file, "utf8");
      expect(src).not.toMatch(/@clime\/meta/);
      expect(src).not.toMatch(/goals\.create/);
      expect(src).not.toMatch(/goals\.update/);
      expect(src).not.toMatch(/decisions\.create/);
      expect(src).not.toMatch(/runDailyDecision/);
      expect(src).not.toMatch(/executive\./i);
    }
    const packagesDir = join(process.cwd(), "..");
    expect(existsSync(join(packagesDir, "learning"))).toBe(true);
    expect(existsSync(join(packagesDir, "memory"))).toBe(true);
    // Meta package may not exist yet (Phase J) — must not be required by learning
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };
    expect(pkg.dependencies?.["@clime/meta"]).toBeUndefined();
  });

  it("ROI path records Memory episode + LearningPolicy", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "roi-path" });
      const memory = createMemoryEngine(storage);
      const learning = createLearningEngine(storage);
      const result = await learning.proposeFromRoi({
        memory,
        snapshot: {
          schema_version: 1,
          kind: "learning.roi_snapshot",
          id: "roi_path",
          projectId,
          measuredRoi: 2,
          formatHint: "shorts",
          isEstimate: false,
          confidence: 0.92,
          summary: "shorts win",
          measuredAt: new Date().toISOString(),
        },
      });
      expect(result.episodeId).toBeTruthy();
      expect(result.autoPromoted).toBe(true);
      const episodes = await memory.listEpisodes(projectId, {
        episodeKind: "roi",
      });
      expect(episodes.some((e) => e.id === result.episodeId)).toBe(true);
    } finally {
      storage.close();
    }
  });
});
