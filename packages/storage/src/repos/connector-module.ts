import { eq } from "drizzle-orm";
import {
  connectorRegistration,
  moduleRegistration,
} from "../db/schema.js";
import type {
  ConnectorRepository,
  ModuleRepository,
} from "../ports/repositories.js";
import {
  assertJsonEnvelope,
  newId,
  nowIso,
  type RepoContext,
} from "./helpers.js";

export function createConnectorRepository(
  ctx: RepoContext,
): ConnectorRepository {
  return {
    async upsert(input) {
      assertJsonEnvelope(input.manifestJson, "connectorRegistration.manifestJson");
      const existing = await this.getByConnectorId(input.connectorId);
      const now = nowIso();
      if (existing) {
        const id = input.id ?? existing.id;
        await ctx.db
          .update(connectorRegistration)
          .set({
            version: input.version,
            lifecycle: input.lifecycle,
            manifestJson: input.manifestJson,
            updatedAt: now,
          })
          .where(eq(connectorRegistration.id, existing.id));
        return { id };
      }
      const id = input.id ?? newId();
      await ctx.db.insert(connectorRegistration).values({
        id,
        connectorId: input.connectorId,
        version: input.version,
        lifecycle: input.lifecycle,
        manifestJson: input.manifestJson,
        registeredAt: now,
        updatedAt: now,
      });
      return { id };
    },

    async getByConnectorId(connectorId) {
      const rows = await ctx.db
        .select()
        .from(connectorRegistration)
        .where(eq(connectorRegistration.connectorId, connectorId))
        .limit(1);
      return rows[0] ?? null;
    },

    async list() {
      return ctx.db.select().from(connectorRegistration);
    },
  };
}

export function createModuleRepository(ctx: RepoContext): ModuleRepository {
  return {
    async upsert(input) {
      assertJsonEnvelope(input.depsJson, "moduleRegistration.depsJson");
      assertJsonEnvelope(input.manifestJson, "moduleRegistration.manifestJson");
      const existing = await this.getByModuleId(input.moduleId);
      const now = nowIso();
      if (existing) {
        const id = input.id ?? existing.id;
        await ctx.db
          .update(moduleRegistration)
          .set({
            version: input.version,
            depsJson: input.depsJson,
            lifecycle: input.lifecycle,
            manifestJson: input.manifestJson,
            updatedAt: now,
          })
          .where(eq(moduleRegistration.id, existing.id));
        return { id };
      }
      const id = input.id ?? newId();
      await ctx.db.insert(moduleRegistration).values({
        id,
        moduleId: input.moduleId,
        version: input.version,
        depsJson: input.depsJson,
        lifecycle: input.lifecycle,
        manifestJson: input.manifestJson,
        registeredAt: now,
        updatedAt: now,
      });
      return { id };
    },

    async getByModuleId(moduleId) {
      const rows = await ctx.db
        .select()
        .from(moduleRegistration)
        .where(eq(moduleRegistration.moduleId, moduleId))
        .limit(1);
      return rows[0] ?? null;
    },

    async list() {
      return ctx.db.select().from(moduleRegistration);
    },
  };
}
