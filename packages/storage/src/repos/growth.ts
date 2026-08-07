import { and, asc, desc, eq, isNull, lt, sql } from "drizzle-orm";
import {
  decisionRecord,
  mission,
  plannerQueueItem,
} from "../db/schema.js";
import type {
  DecisionRepository,
  MissionRepository,
  PlannerQueueRepository,
} from "../ports/repositories.js";
import {
  assertJsonEnvelope,
  assertStringListEnvelope,
  newId,
  nowIso,
  type RepoContext,
  stripUndefined,
} from "./helpers.js";

export function createMissionRepository(ctx: RepoContext): MissionRepository {
  return {
    async create(input) {
      assertJsonEnvelope(input.payloadJson, "mission.payloadJson");
      const id = newId();
      const now = nowIso();
      await ctx.db.insert(mission).values({
        id,
        projectId: input.projectId,
        missionDate: input.missionDate,
        title: input.title,
        status: input.status,
        priority: input.priority,
        decisionId: input.decisionId ?? null,
        payloadJson: input.payloadJson,
        createdAt: now,
        updatedAt: now,
      });
      return { id };
    },

    async getById(id) {
      const rows = await ctx.db
        .select()
        .from(mission)
        .where(eq(mission.id, id))
        .limit(1);
      return rows[0] ?? null;
    },

    async listByDate(projectId, missionDate) {
      return ctx.db
        .select()
        .from(mission)
        .where(
          and(
            eq(mission.projectId, projectId),
            eq(mission.missionDate, missionDate),
          ),
        );
    },

    async update(id, patch) {
      const cleaned = stripUndefined(patch);
      if (cleaned.payloadJson != null) {
        assertJsonEnvelope(cleaned.payloadJson, "mission.payloadJson");
      }
      // Never allow id overwrite via patch
      delete cleaned.id;
      if (Object.keys(cleaned).length === 0) return;
      await ctx.db
        .update(mission)
        .set({ ...cleaned, updatedAt: nowIso() })
        .where(eq(mission.id, id));
    },
  };
}

export function createDecisionRepository(
  ctx: RepoContext,
): DecisionRepository {
  return {
    async create(input) {
      assertJsonEnvelope(input.graphJson, "decisionRecord.graphJson");
      const id = newId();
      const now = nowIso();
      await ctx.db.insert(decisionRecord).values({
        id,
        projectId: input.projectId,
        decidedAt: input.decidedAt,
        missionId: input.missionId ?? null,
        graphJson: input.graphJson,
        narrative: input.narrative ?? null,
        createdAt: now,
      });
      return { id };
    },

    async getById(id) {
      const rows = await ctx.db
        .select()
        .from(decisionRecord)
        .where(eq(decisionRecord.id, id))
        .limit(1);
      return rows[0] ?? null;
    },

    async latestForProject(projectId) {
      const rows = await ctx.db
        .select()
        .from(decisionRecord)
        .where(eq(decisionRecord.projectId, projectId))
        .orderBy(desc(decisionRecord.decidedAt))
        .limit(1);
      return rows[0] ?? null;
    },
  };
}

export function createPlannerQueueRepository(
  ctx: RepoContext,
): PlannerQueueRepository {
  return {
    async enqueue(input) {
      assertStringListEnvelope(
        input.dependencyIdsJson,
        "plannerQueueItem.dependencyIdsJson",
      );
      assertJsonEnvelope(input.payloadJson, "plannerQueueItem.payloadJson");
      const id = newId();
      const now = nowIso();
      await ctx.db.insert(plannerQueueItem).values({
        id,
        projectId: input.projectId,
        priority: input.priority,
        deadline: input.deadline ?? null,
        expectedRoi: input.expectedRoi ?? null,
        dependencyIdsJson: input.dependencyIdsJson,
        retryCount: input.retryCount ?? 0,
        humanApproval: input.humanApproval ?? 0,
        decisionId: input.decisionId ?? null,
        missionId: input.missionId ?? null,
        payloadJson: input.payloadJson,
        status: input.status,
        leasedBy: input.leasedBy ?? null,
        leasedAt: input.leasedAt ?? null,
        leaseExpiresAt: input.leaseExpiresAt ?? null,
        createdAt: now,
        updatedAt: now,
      });
      return { id };
    },

    async getById(id) {
      const rows = await ctx.db
        .select()
        .from(plannerQueueItem)
        .where(eq(plannerQueueItem.id, id))
        .limit(1);
      return rows[0] ?? null;
    },

    async listReady(projectId, limit) {
      return ctx.db
        .select()
        .from(plannerQueueItem)
        .where(
          and(
            eq(plannerQueueItem.projectId, projectId),
            eq(plannerQueueItem.status, "ready"),
          ),
        )
        .orderBy(asc(plannerQueueItem.priority), asc(plannerQueueItem.createdAt))
        .limit(limit);
    },

    async listByProject(projectId, limit) {
      return ctx.db
        .select()
        .from(plannerQueueItem)
        .where(eq(plannerQueueItem.projectId, projectId))
        .orderBy(asc(plannerQueueItem.createdAt))
        .limit(limit);
    },

    async lease(id, workerId, at, leaseExpiresAt) {
      const rows = await ctx.db
        .update(plannerQueueItem)
        .set({
          status: "leased",
          leasedBy: workerId,
          leasedAt: at,
          leaseExpiresAt,
          updatedAt: nowIso(),
        })
        .where(
          and(
            eq(plannerQueueItem.id, id),
            eq(plannerQueueItem.status, "ready"),
            isNull(plannerQueueItem.leasedBy),
          ),
        )
        .returning({ id: plannerQueueItem.id });
      return rows.length > 0;
    },

    async heartbeat(id, workerId, leaseExpiresAt) {
      const rows = await ctx.db
        .update(plannerQueueItem)
        .set({
          leaseExpiresAt,
          updatedAt: nowIso(),
        })
        .where(
          and(
            eq(plannerQueueItem.id, id),
            eq(plannerQueueItem.status, "leased"),
            eq(plannerQueueItem.leasedBy, workerId),
          ),
        )
        .returning({ id: plannerQueueItem.id });
      return rows.length > 0;
    },

    async reclaimExpired(now) {
      const rows = await ctx.db
        .update(plannerQueueItem)
        .set({
          status: "ready",
          leasedBy: null,
          leasedAt: null,
          leaseExpiresAt: null,
          updatedAt: nowIso(),
        })
        .where(
          and(
            eq(plannerQueueItem.status, "leased"),
            lt(plannerQueueItem.leaseExpiresAt, now),
            sql`${plannerQueueItem.leaseExpiresAt} IS NOT NULL`,
          ),
        )
        .returning({ id: plannerQueueItem.id });
      return rows.map((r) => r.id);
    },

    async updateStatus(id, status) {
      const patch: {
        status: string;
        updatedAt: string;
        leasedBy?: null;
        leasedAt?: null;
        leaseExpiresAt?: null;
      } = { status, updatedAt: nowIso() };
      if (status !== "leased") {
        patch.leasedBy = null;
        patch.leasedAt = null;
        patch.leaseExpiresAt = null;
      }
      await ctx.db
        .update(plannerQueueItem)
        .set(patch)
        .where(eq(plannerQueueItem.id, id));
    },
  };
}
