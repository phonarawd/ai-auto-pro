import { and, eq } from "drizzle-orm";
import {
  globalSettings,
  project,
  projectSettings,
  userSettings,
} from "../db/schema.js";
import type {
  ProjectRepository,
  SettingsRepository,
} from "../ports/repositories.js";
import {
  assertJsonEnvelope,
  newId,
  nowIso,
  type RepoContext,
  stripUndefined,
} from "./helpers.js";

export function createProjectRepository(
  ctx: RepoContext,
): ProjectRepository {
  return {
    async create(input) {
      const id = newId();
      const now = nowIso();
      await ctx.db.insert(project).values({
        id,
        name: input.name,
        status: input.status ?? "active",
        createdAt: now,
        updatedAt: now,
      });
      return { id };
    },

    async getById(id) {
      const rows = await ctx.db
        .select()
        .from(project)
        .where(eq(project.id, id))
        .limit(1);
      return rows[0] ?? null;
    },

    async list() {
      return ctx.db.select().from(project);
    },

    async update(id, patch) {
      const cleaned = stripUndefined(patch);
      if (cleaned.metaJson != null) {
        assertJsonEnvelope(cleaned.metaJson, "project.metaJson");
      }
      if (Object.keys(cleaned).length === 0) return;
      await ctx.db
        .update(project)
        .set({ ...cleaned, updatedAt: nowIso() })
        .where(eq(project.id, id));
    },
  };
}

export function createSettingsRepository(
  ctx: RepoContext,
): SettingsRepository {
  return {
    async getUserPrefs(userKey) {
      const rows = await ctx.db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userKey, userKey))
        .limit(1);
      return rows[0] ?? null;
    },

    async putUserPrefs(userKey, prefsJson) {
      assertJsonEnvelope(prefsJson, "userSettings.prefsJson");
      const existing = await this.getUserPrefs(userKey);
      const now = nowIso();
      if (existing) {
        await ctx.db
          .update(userSettings)
          .set({ prefsJson, updatedAt: now })
          .where(eq(userSettings.id, existing.id));
        return;
      }
      await ctx.db.insert(userSettings).values({
        id: newId(),
        userKey,
        prefsJson,
        updatedAt: now,
      });
    },

    async getGlobal(key) {
      const rows = await ctx.db
        .select()
        .from(globalSettings)
        .where(eq(globalSettings.key, key))
        .limit(1);
      return rows[0] ?? null;
    },

    async putGlobal(key, valueJson) {
      assertJsonEnvelope(valueJson, "globalSettings.valueJson");
      const existing = await this.getGlobal(key);
      const now = nowIso();
      if (existing) {
        await ctx.db
          .update(globalSettings)
          .set({ valueJson, updatedAt: now })
          .where(eq(globalSettings.id, existing.id));
        return;
      }
      await ctx.db.insert(globalSettings).values({
        id: newId(),
        key,
        valueJson,
        updatedAt: now,
      });
    },

    async listGlobal() {
      return ctx.db.select().from(globalSettings);
    },

    async getProject(projectId, key) {
      const rows = await ctx.db
        .select()
        .from(projectSettings)
        .where(
          and(
            eq(projectSettings.projectId, projectId),
            eq(projectSettings.key, key),
          ),
        )
        .limit(1);
      return rows[0] ?? null;
    },

    async putProject(projectId, key, valueJson) {
      assertJsonEnvelope(valueJson, "projectSettings.valueJson");
      const existing = await this.getProject(projectId, key);
      const now = nowIso();
      if (existing) {
        await ctx.db
          .update(projectSettings)
          .set({ valueJson, updatedAt: now })
          .where(eq(projectSettings.id, existing.id));
        return;
      }
      await ctx.db.insert(projectSettings).values({
        id: newId(),
        projectId,
        key,
        valueJson,
        updatedAt: now,
      });
    },

    async listProject(projectId) {
      return ctx.db
        .select()
        .from(projectSettings)
        .where(eq(projectSettings.projectId, projectId));
    },
  };
}
