import { describe, expect, it } from "vitest";
import { createResearchEngine } from "@clime/growth-research";
import { createSqliteStorage } from "@clime/storage";
import { createTopicGeneratorEngine } from "./engine.js";
import { createPlanningDomainHandlers } from "./api.js";
import { enqueueFromDecision } from "./queue-producer.js";
import { topicCandidateSchema } from "./schemas.js";
import {
  bufferDecisionItems,
  suggestSchedule,
  DEFAULT_QUEUE_VOLUME_CAP,
} from "./scheduler-intelligence.js";

describe("D-C growth/planning Topic Generator", () => {
  it("generates topics from Mission/Decision pipe + research inputs", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "D-C" });
      const research = createResearchEngine(storage);
      await research.runResearchJob({ projectId, traceId: "tr_pipe" });

      const planning = createTopicGeneratorEngine(research);
      const result = await planning.generateTopic({
        projectId,
        missionId: "mis_1",
        missionGoal: "Grow CLIME signups via Shorts",
        decisionId: "dec_1",
        decisionSummary: "Prioritize AI automation education mix",
        maxTopics: 3,
        traceId: "tr_topic",
      });

      expect(result.kind).toBe("growth.topic_generate_result");
      expect(result.schema_version).toBe(1);
      expect(result.missionId).toBe("mis_1");
      expect(result.decisionId).toBe("dec_1");
      expect(result.topics.length).toBeGreaterThan(0);
      expect(result.topics.length).toBeLessThanOrEqual(3);

      const topic = topicCandidateSchema.parse(result.topics[0]);
      expect(topic.kind).toBe("growth.topic_candidate");
      expect(topic.missionId).toBe("mis_1");
      expect(topic.decisionId).toBe("dec_1");
      expect(topic.angle).toContain("Mission:");
      expect(topic.angle).toContain("Decision:");
      expect(topic.primaryKeyword.length).toBeGreaterThan(0);
    } finally {
      storage.close();
    }
  });

  it("enqueueFromDecision produces ready PlannerQueueItem (Decision→Queue, not Workers)", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "E-Queue" });
      const { queueItemIds } = await enqueueFromDecision(storage, {
        projectId,
        decisionId: "dec_q",
        missionId: "mis_q",
        items: [
          {
            priority: 1,
            expectedRoi: 0.7,
            payload: {
              schema_version: 1,
              kind: "growth.decision_queue_work",
              title: "test",
            },
          },
        ],
      });
      expect(queueItemIds).toHaveLength(1);
      const row = await storage.plannerQueue.getById(queueItemIds[0]!);
      expect(row?.status).toBe("ready");
      expect(row?.decisionId).toBe("dec_q");
      expect(row?.missionId).toBe("mis_q");
      expect(row?.deadline).toBeTruthy();
      expect(row?.humanApproval).toBe(0);
    } finally {
      storage.close();
    }
  });

  it("H-A: volume buffer caps enqueue and Scheduler Intel fills deadlines", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "H-A" });
      const now = new Date("2026-08-07T01:00:00.000Z");
      const items = Array.from({ length: DEFAULT_QUEUE_VOLUME_CAP + 3 }, (_, i) => ({
        priority: i === 0 ? 1 : 5,
        expectedRoi: 0.5,
        payload: {
          schema_version: 1 as const,
          kind: "growth.decision_queue_work",
          title: `item-${i}`,
        },
      }));
      const result = await enqueueFromDecision(storage, {
        projectId,
        decisionId: "dec_ha",
        missionId: "mis_ha",
        items,
        now,
      });
      expect(result.bufferedCount).toBe(DEFAULT_QUEUE_VOLUME_CAP);
      expect(result.droppedCount).toBe(3);
      expect(result.queueItemIds).toHaveLength(DEFAULT_QUEUE_VOLUME_CAP);

      const first = await storage.plannerQueue.getById(result.queueItemIds[0]!);
      expect(first?.deadline).toBeTruthy();
      expect(first?.priority).toBe(1);
      const payload = JSON.parse(first!.payloadJson) as {
        scheduleCadenceHint?: string;
      };
      expect(payload.scheduleCadenceHint).toBeTruthy();

      const withApproval = await enqueueFromDecision(storage, {
        projectId,
        decisionId: "dec_ha2",
        missionId: "mis_ha2",
        items: [
          {
            priority: 2,
            humanApproval: true,
            dependencyIds: ["dep_1"],
            deadline: "2026-08-08T09:00:00.000Z",
            payload: {
              schema_version: 1,
              kind: "growth.decision_queue_work",
              title: "gated",
            },
          },
        ],
        applySchedulerIntel: false,
      });
      const gated = await storage.plannerQueue.getById(withApproval.queueItemIds[0]!);
      expect(gated?.humanApproval).toBe(1);
      expect(gated?.deadline).toBe("2026-08-08T09:00:00.000Z");
      const deps = JSON.parse(gated!.dependencyIdsJson) as {
        schema_version: number;
        ids: string[];
      };
      expect(deps.schema_version).toBe(1);
      expect(deps.ids).toEqual(["dep_1"]);
    } finally {
      storage.close();
    }
  });

  it("H-A: suggestSchedule is advisory and does not invent daily rank", () => {
    const buffered = bufferDecisionItems({
      items: [
        { priority: 3, expectedRoi: 0.2 },
        { priority: 1, expectedRoi: 0.9 },
        { priority: 1, expectedRoi: 0.1 },
      ],
      maxItems: 2,
    });
    expect(buffered.kept).toHaveLength(2);
    expect(buffered.kept[0]?.priority).toBe(1);
    expect(buffered.kept[0]?.expectedRoi).toBe(0.9);
    expect(buffered.dropped).toHaveLength(1);

    const schedule = suggestSchedule(
      [
        { priority: 1, expectedRoi: 0.8 },
        { priority: 4, expectedRoi: 0.1 },
      ],
      { now: new Date("2026-08-07T01:00:00.000Z") },
    );
    expect(schedule.kind).toBe("growth.schedule_suggestion");
    expect(schedule.schema_version).toBe(1);
    expect(schedule.slots).toHaveLength(2);
    expect(schedule.slots[0]?.suggestedDeadline).toBeTruthy();
  });

  it("domain handler growth.generateTopic works", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "D-C-API" });
      const research = createResearchEngine(storage);
      await research.runResearchJob({ projectId, traceId: "tr_api_r" });
      const planning = createTopicGeneratorEngine(research);
      const handlers = createPlanningDomainHandlers(planning, {
        defaultProjectId: projectId,
      });

      const res = (await handlers["growth.generateTopic"]!(
        {
          projectId,
          missionGoal: "Referral content",
          decisionSummary: "Organic only",
        },
        { requestId: "r1", traceId: "tr_gen", projectId },
      )) as { topics: unknown[]; schema_version: number };

      expect(res.schema_version).toBe(1);
      expect(res.topics.length).toBeGreaterThan(0);
    } finally {
      storage.close();
    }
  });
});
