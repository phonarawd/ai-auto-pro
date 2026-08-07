import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createResearchEngine } from "./engine.js";
import { createSqliteStorage } from "@clime/storage";

function listDirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

describe("D-D Growth MVP Prove (research side)", () => {
  it("Phase D growth umbrellas include research + planning (no viral god-package)", () => {
    const growthRoot = join(process.cwd(), "..");
    const dirs = listDirs(growthRoot);
    expect(dirs).toContain("research");
    expect(dirs).toContain("planning");
    expect(existsSync(join(growthRoot, "viral"))).toBe(false);
    expect(existsSync(join(process.cwd(), "../../viral"))).toBe(false);
  });

  it("research has no Topic Generator implementation", () => {
    expect(existsSync(join(process.cwd(), "src", "topic-generator.ts"))).toBe(false);
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { name: string };
    expect(pkg.name).toBe("@clime/growth-research");
  });

  it("free trend path + Multi-Jack hook contract fields", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "D-D" });
      const engine = createResearchEngine(storage);
      await engine.runResearchJob({ projectId, traceId: "tr_dd" });
      const trends = await engine.getNormalizedTrends(projectId);
      expect(trends.length).toBeGreaterThan(0);
      const hook = await engine.buildMultiJackHook({
        projectId,
        trendId: trends[0]!.id,
      });
      expect(hook.ok).toBe(true);
      if (!hook.ok) return;
      expect(hook.hook.paidApiRequired).toBe(false);
      expect(hook.hook.kind).toBe("growth.multi_jack_content_hook");
    } finally {
      storage.close();
    }
  });
});
