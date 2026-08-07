import { and, asc, eq } from "drizzle-orm";
import {
  analyticsSnapshot,
  eventOutbox,
  knowledgeItem,
} from "../db/schema.js";
import type {
  AnalyticsRepository,
  EventOutboxRepository,
  KnowledgeRepository,
} from "../ports/repositories.js";
import {
  assertJsonEnvelope,
  assertStringListEnvelope,
  newId,
  nowIso,
  type RepoContext,
} from "./helpers.js";

export function createKnowledgeRepository(
  ctx: RepoContext,
): KnowledgeRepository {
  return {
    async upsert(input) {
      assertStringListEnvelope(input.tagsJson, "knowledgeItem.tagsJson");
      if (input.body != null) {
        assertJsonEnvelope(input.body, "knowledgeItem.body");
      }
      if (input.evolutionJson != null) {
        assertJsonEnvelope(input.evolutionJson, "knowledgeItem.evolutionJson");
      }
      const now = nowIso();
      if (input.id) {
        const existing = await this.getById(input.id);
        if (existing) {
          await ctx.db
            .update(knowledgeItem)
            .set({
              projectId: input.projectId,
              namespace: input.namespace,
              type: input.type,
              tagsJson: input.tagsJson,
              body: input.body ?? null,
              blobRef: input.blobRef ?? null,
              evolutionJson: input.evolutionJson ?? null,
              updatedAt: now,
            })
            .where(eq(knowledgeItem.id, input.id));
          return { id: input.id };
        }
      }
      const id = input.id ?? newId();
      await ctx.db.insert(knowledgeItem).values({
        id,
        projectId: input.projectId,
        namespace: input.namespace,
        type: input.type,
        tagsJson: input.tagsJson,
        body: input.body ?? null,
        blobRef: input.blobRef ?? null,
        evolutionJson: input.evolutionJson ?? null,
        createdAt: now,
        updatedAt: now,
      });
      return { id };
    },

    async getById(id) {
      const rows = await ctx.db
        .select()
        .from(knowledgeItem)
        .where(eq(knowledgeItem.id, id))
        .limit(1);
      return rows[0] ?? null;
    },

    async list(projectId, filter) {
      const conditions = [eq(knowledgeItem.projectId, projectId)];
      if (filter?.namespace) {
        conditions.push(eq(knowledgeItem.namespace, filter.namespace));
      }
      if (filter?.type) {
        conditions.push(eq(knowledgeItem.type, filter.type));
      }
      return ctx.db
        .select()
        .from(knowledgeItem)
        .where(and(...conditions));
    },

    async remove(id) {
      await ctx.db.delete(knowledgeItem).where(eq(knowledgeItem.id, id));
    },
  };
}

export function createEventOutboxRepository(
  ctx: RepoContext,
): EventOutboxRepository {
  return {
    async enqueue(input) {
      assertJsonEnvelope(input.payloadJson, "eventOutbox.payloadJson");
      const id = newId();
      await ctx.db.insert(eventOutbox).values({
        id,
        projectId: input.projectId ?? null,
        type: input.type,
        payloadJson: input.payloadJson,
        traceId: input.traceId,
        occurredAt: input.occurredAt,
        publishedAt: null,
        attempts: 0,
        status: input.status,
      });
      return { id };
    },

    async listPending(limit) {
      return ctx.db
        .select()
        .from(eventOutbox)
        .where(eq(eventOutbox.status, "pending"))
        .orderBy(asc(eventOutbox.occurredAt))
        .limit(limit);
    },

    async markPublished(id, publishedAt) {
      await ctx.db
        .update(eventOutbox)
        .set({ publishedAt, status: "published" })
        .where(eq(eventOutbox.id, id));
    },

    async markFailed(id, attempts) {
      await ctx.db
        .update(eventOutbox)
        .set({ attempts, status: "failed" })
        .where(eq(eventOutbox.id, id));
    },
  };
}

export function createAnalyticsRepository(
  ctx: RepoContext,
): AnalyticsRepository {
  return {
    async putSnapshot(input) {
      assertJsonEnvelope(input.metricsJson, "analyticsSnapshot.metricsJson");
      const existing = await this.getSnapshot(input.projectId, input.period);
      if (existing) {
        const id = input.id ?? existing.id;
        await ctx.db
          .update(analyticsSnapshot)
          .set({
            metricsJson: input.metricsJson,
            capturedAt: input.capturedAt,
          })
          .where(eq(analyticsSnapshot.id, existing.id));
        return { id };
      }
      const id = input.id ?? newId();
      await ctx.db.insert(analyticsSnapshot).values({
        id,
        projectId: input.projectId,
        period: input.period,
        metricsJson: input.metricsJson,
        capturedAt: input.capturedAt,
      });
      return { id };
    },

    async getSnapshot(projectId, period) {
      const rows = await ctx.db
        .select()
        .from(analyticsSnapshot)
        .where(
          and(
            eq(analyticsSnapshot.projectId, projectId),
            eq(analyticsSnapshot.period, period),
          ),
        )
        .limit(1);
      return rows[0] ?? null;
    },
  };
}
