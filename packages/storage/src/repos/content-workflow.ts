import { and, desc, eq } from "drizzle-orm";
import {
  publishingHistoryKindSchema,
  taskStateSchema,
  type TaskState,
} from "@clime/shared";
import {
  contentItem,
  publishingHistoryEvent,
  workflowRun,
} from "../db/schema.js";
import type {
  ContentRepository,
  WorkflowRunRepository,
  WorkflowTransitionResult,
} from "../ports/repositories.js";
import {
  assertJsonEnvelope,
  newId,
  nowIso,
  type RepoContext,
  stripUndefined,
} from "./helpers.js";

export function createWorkflowRunRepository(
  ctx: RepoContext,
): WorkflowRunRepository {
  return {
    async create(input) {
      assertJsonEnvelope(input.dslJson, "workflowRun.dslJson");
      taskStateSchema.parse(input.state);
      if (input.cursorJson != null) {
        assertJsonEnvelope(input.cursorJson, "workflowRun.cursorJson");
      }
      const id = newId();
      const now = nowIso();
      await ctx.db.insert(workflowRun).values({
        id,
        projectId: input.projectId,
        queueItemId: input.queueItemId ?? null,
        missionId: input.missionId ?? null,
        decisionId: input.decisionId ?? null,
        dslJson: input.dslJson,
        state: input.state,
        cursorJson: input.cursorJson ?? null,
        traceId: input.traceId,
        version: input.version ?? 1,
        createdAt: now,
        updatedAt: now,
      });
      return { id };
    },

    async getById(id) {
      const rows = await ctx.db
        .select()
        .from(workflowRun)
        .where(eq(workflowRun.id, id))
        .limit(1);
      return rows[0] ?? null;
    },

    async transition(id, state: TaskState, cursorJson) {
      const current = await this.getById(id);
      if (!current) return { ok: false as const, reason: "not_found" as const };
      return this.transitionWithLock(id, {
        expectedVersion: current.version,
        expectedUpdatedAt: current.updatedAt,
        state,
        cursorJson,
      });
    },

    async transitionWithLock(id, input): Promise<WorkflowTransitionResult> {
      taskStateSchema.parse(input.state);
      if (input.cursorJson != null) {
        assertJsonEnvelope(input.cursorJson, "workflowRun.cursorJson");
      }
      const updatedAt = nowIso();
      const nextVersion = input.expectedVersion + 1;
      const patch: {
        state: string;
        updatedAt: string;
        version: number;
        cursorJson?: string | null;
      } = {
        state: input.state,
        updatedAt,
        version: nextVersion,
      };
      if (input.cursorJson !== undefined) {
        patch.cursorJson = input.cursorJson;
      }
      const rows = await ctx.db
        .update(workflowRun)
        .set(patch)
        .where(
          and(
            eq(workflowRun.id, id),
            eq(workflowRun.version, input.expectedVersion),
            eq(workflowRun.updatedAt, input.expectedUpdatedAt),
          ),
        )
        .returning({ id: workflowRun.id });
      if (rows.length === 0) {
        const exists = await this.getById(id);
        return {
          ok: false,
          reason: exists ? "conflict" : "not_found",
        };
      }
      return { ok: true, version: nextVersion, updatedAt };
    },

    async listByProject(projectId, limit) {
      return ctx.db
        .select()
        .from(workflowRun)
        .where(eq(workflowRun.projectId, projectId))
        .orderBy(desc(workflowRun.createdAt))
        .limit(limit);
    },
  };
}

export function createContentRepository(ctx: RepoContext): ContentRepository {
  return {
    async createItem(input) {
      assertJsonEnvelope(input.metaJson, "contentItem.metaJson");
      const id = newId();
      const now = nowIso();
      await ctx.db.insert(contentItem).values({
        id,
        projectId: input.projectId,
        workflowRunId: input.workflowRunId ?? null,
        targetAccountId: input.targetAccountId ?? null,
        channel: input.channel,
        format: input.format,
        status: input.status,
        artifactRef: input.artifactRef ?? null,
        metaJson: input.metaJson,
        createdAt: now,
        updatedAt: now,
      });
      return { id };
    },

    async getItem(id) {
      const rows = await ctx.db
        .select()
        .from(contentItem)
        .where(eq(contentItem.id, id))
        .limit(1);
      return rows[0] ?? null;
    },

    async updateItem(id, patch) {
      const cleaned = stripUndefined(patch);
      if (cleaned.metaJson != null) {
        assertJsonEnvelope(cleaned.metaJson, "contentItem.metaJson");
      }
      delete cleaned.id;
      if (Object.keys(cleaned).length === 0) return;
      await ctx.db
        .update(contentItem)
        .set({ ...cleaned, updatedAt: nowIso() })
        .where(eq(contentItem.id, id));
    },

    async appendHistory(input) {
      publishingHistoryKindSchema.parse(input.kind);
      if (input.metaJson != null) {
        assertJsonEnvelope(input.metaJson, "publishingHistoryEvent.metaJson");
      }
      const id = newId();
      await ctx.db.insert(publishingHistoryEvent).values({
        id,
        projectId: input.projectId,
        contentItemId: input.contentItemId ?? null,
        accountId: input.accountId ?? null,
        kind: input.kind,
        publishMode: input.publishMode ?? null,
        exportPath: input.exportPath ?? null,
        externalPostId: input.externalPostId ?? null,
        metaJson: input.metaJson ?? null,
        occurredAt: input.occurredAt,
      });
      return { id };
    },

    async listHistory(projectId, limit) {
      return ctx.db
        .select()
        .from(publishingHistoryEvent)
        .where(eq(publishingHistoryEvent.projectId, projectId))
        .orderBy(desc(publishingHistoryEvent.occurredAt))
        .limit(limit);
    },
  };
}
