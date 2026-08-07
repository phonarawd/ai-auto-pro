import { describe, expect, it } from "vitest";
import { createMemoryEngine } from "@clime/memory";
import { createSqliteStorage } from "@clime/storage";
import { CONFIDENCE_AUTO_PROMOTE_THRESHOLD } from "./confidence.js";
import { createLearningEngine } from "./engine.js";
import { LEARNING_KNOWLEDGE } from "./schemas.js";

describe("I-B learning engine — Confidence + Reflection", () => {
  it("auto-promotes only when confidence ≥ 0.91", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "learn" });
      const memory = createMemoryEngine(storage);
      const learning = createLearningEngine(storage);

      const low = await learning.proposeFromRoi({
        memory,
        snapshot: {
          schema_version: 1,
          kind: "learning.roi_snapshot",
          id: "roi_low",
          projectId,
          measuredRoi: 1.2,
          isEstimate: false,
          confidence: 0.31,
          summary: "weak lift",
          measuredAt: new Date().toISOString(),
        },
      });
      expect(low.ok).toBe(true);
      expect(low.autoPromoted).toBe(false);
      expect(low.status).toBe("suggested");
      expect(low.strategyPlaybookId).toBeUndefined();

      const high = await learning.proposeFromRoi({
        memory,
        snapshot: {
          schema_version: 1,
          kind: "learning.roi_snapshot",
          id: "roi_high",
          projectId,
          measuredRoi: 1.8,
          formatHint: "reels",
          isEstimate: false,
          confidence: 0.95,
          summary: "strong reels ROI",
          measuredAt: new Date().toISOString(),
        },
      });
      expect(high.ok).toBe(true);
      expect(high.autoPromoted).toBe(true);
      expect(high.status).toBe("active");
      expect(high.strategyPlaybookId).toBeTruthy();
      expect(high.threshold).toBe(CONFIDENCE_AUTO_PROMOTE_THRESHOLD);

      const playbooks = await storage.knowledge.list(projectId, {
        namespace: LEARNING_KNOWLEDGE.strategyNamespace,
        type: LEARNING_KNOWLEDGE.playbookType,
      });
      expect(playbooks.length).toBeGreaterThanOrEqual(1);
    } finally {
      storage.close();
    }
  });

  it("Reflection proposes policy — Meta does not own it", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "refl" });
      const learning = createLearningEngine(storage);
      const result = await learning.runReflection({
        projectId,
        title: "Postmortem: challenge pause",
        postmortem: "Challenge paused publish; keep Validate gate.",
        confidence: 0.5,
      });
      expect(result.autoPromoted).toBe(false);
      expect(result.status).toBe("suggested");
      expect(result.reflection.kind).toBe("learning.reflection");

      const reflections = await learning.listReflections(projectId);
      expect(reflections).toHaveLength(1);

      const goals = await storage.goals.list(projectId);
      expect(goals).toHaveLength(0);
    } finally {
      storage.close();
    }
  });

  it("acceptProposal activates suggested policy + strategy playbook", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "acc" });
      const memory = createMemoryEngine(storage);
      const learning = createLearningEngine(storage);
      const proposed = await learning.proposeFromRoi({
        memory,
        snapshot: {
          schema_version: 1,
          kind: "learning.roi_snapshot",
          id: "roi_acc",
          projectId,
          measuredRoi: 1.1,
          isEstimate: false,
          confidence: 0.4,
          summary: "needs human",
          measuredAt: new Date().toISOString(),
        },
      });
      expect(proposed.policyId).toBeTruthy();
      const accepted = await learning.acceptProposal(proposed.policyId!);
      expect(accepted.accepted).toBe(true);
      expect(accepted.status).toBe("active");
      expect(accepted.strategyPlaybookId).toBeTruthy();
    } finally {
      storage.close();
    }
  });
});
