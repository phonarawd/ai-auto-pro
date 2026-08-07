import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createMemoryEngine } from "./engine.js";
import { createSqliteStorage } from "@clime/storage";
import { MEMORY_KNOWLEDGE } from "./schemas.js";

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTsFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

describe("I-D memory prove — episodes only · no policy ownership", () => {
  it("package home is @clime/memory", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { name?: string };
    expect(pkg.name).toBe("@clime/memory");
    expect(existsSync(join(process.cwd(), "src", "engine.ts"))).toBe(true);
  });

  it("ROI measurement episode uses namespace=memory only", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "mprove" });
      const engine = createMemoryEngine(storage);
      await engine.recordEpisode({
        projectId,
        episodeKind: "roi",
        summary: "measured ROI episode",
        facts: { measuredRoi: 1.5 },
      });
      const mem = await storage.knowledge.list(projectId, {
        namespace: MEMORY_KNOWLEDGE.namespace,
      });
      expect(mem.length).toBeGreaterThanOrEqual(1);
      const strategy = await storage.knowledge.list(projectId, {
        namespace: "strategy",
      });
      expect(strategy).toHaveLength(0);
      expect(await storage.learning.list(projectId)).toHaveLength(0);
    } finally {
      storage.close();
    }
  });

  it("domain exit 0 — memory must not import learning or write policies", () => {
    const root = join(process.cwd(), "src");
    for (const file of listTsFiles(root)) {
      if (file.endsWith(".test.ts")) continue;
      const src = readFileSync(file, "utf8");
      expect(src).not.toMatch(/from\s+["']@clime\/learning["']/);
      expect(src).not.toMatch(/learning\.put/);
      expect(src).not.toMatch(/from\s+["']@clime\/meta["']/);
    }
  });
});
