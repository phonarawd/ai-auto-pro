import { eq } from "drizzle-orm";
import {
  publishModeSchema,
  riskLevelSchema,
} from "@clime/shared";
import {
  accountCredentialRef,
  platformAccount,
  platformCapability,
  sessionRecord,
} from "../db/schema.js";
import type { AccountRepository } from "../ports/repositories.js";
import {
  assertJsonEnvelope,
  newId,
  nowIso,
  type RepoContext,
} from "./helpers.js";

export function createAccountRepository(
  ctx: RepoContext,
): AccountRepository {
  return {
    async createAccount(input) {
      const id = input.id ?? newId();
      const now = nowIso();
      if (input.routerTagsJson != null) {
        assertJsonEnvelope(input.routerTagsJson, "platformAccount.routerTagsJson");
      }
      await ctx.db.insert(platformAccount).values({
        id,
        projectId: input.projectId,
        platform: input.platform,
        displayName: input.displayName,
        externalId: input.externalId ?? null,
        status: input.status,
        routerTagsJson: input.routerTagsJson ?? null,
        createdAt: now,
        updatedAt: now,
      });
      return { id };
    },

    async getAccount(id) {
      const rows = await ctx.db
        .select()
        .from(platformAccount)
        .where(eq(platformAccount.id, id))
        .limit(1);
      return rows[0] ?? null;
    },

    async listAccounts(projectId) {
      return ctx.db
        .select()
        .from(platformAccount)
        .where(eq(platformAccount.projectId, projectId));
    },

    async putCredentialRef(input) {
      const id = newId();
      const now = nowIso();
      await ctx.db.insert(accountCredentialRef).values({
        id,
        accountId: input.accountId,
        vaultRef: input.vaultRef,
        kind: input.kind,
        createdAt: now,
        updatedAt: now,
      });
      return { id };
    },

    async listCredentialRefs(accountId) {
      return ctx.db
        .select()
        .from(accountCredentialRef)
        .where(eq(accountCredentialRef.accountId, accountId));
    },

    async upsertSession(input) {
      const now = nowIso();
      if (input.metaJson != null) {
        assertJsonEnvelope(input.metaJson, "sessionRecord.metaJson");
      }
      if (input.id) {
        const existing = await this.getSession(input.id);
        if (existing) {
          await ctx.db
            .update(sessionRecord)
            .set({
              accountId: input.accountId,
              status: input.status,
              expiresAt: input.expiresAt ?? null,
              lastUsedAt: input.lastUsedAt ?? null,
              encryptedBlobRef: input.encryptedBlobRef ?? null,
              metaJson: input.metaJson ?? null,
              updatedAt: now,
            })
            .where(eq(sessionRecord.id, input.id));
          return { id: input.id };
        }
      }
      const id = input.id ?? newId();
      await ctx.db.insert(sessionRecord).values({
        id,
        accountId: input.accountId,
        status: input.status,
        expiresAt: input.expiresAt ?? null,
        lastUsedAt: input.lastUsedAt ?? null,
        encryptedBlobRef: input.encryptedBlobRef ?? null,
        metaJson: input.metaJson ?? null,
        createdAt: now,
        updatedAt: now,
      });
      return { id };
    },

    async getSession(id) {
      const rows = await ctx.db
        .select()
        .from(sessionRecord)
        .where(eq(sessionRecord.id, id))
        .limit(1);
      return rows[0] ?? null;
    },

    async upsertCapability(input) {
      publishModeSchema.parse(input.publishMode);
      riskLevelSchema.parse(input.riskLevel);
      assertJsonEnvelope(input.flagsJson, "platformCapability.flagsJson");
      const existing = await this.getCapability(input.accountId);
      if (existing) {
        const id = input.id ?? existing.id;
        await ctx.db
          .update(platformCapability)
          .set({
            canPublish: input.canPublish,
            publishMode: input.publishMode,
            riskLevel: input.riskLevel,
            flagsJson: input.flagsJson,
            snapshotAt: input.snapshotAt,
          })
          .where(eq(platformCapability.id, existing.id));
        return { id };
      }
      const id = input.id ?? newId();
      await ctx.db.insert(platformCapability).values({
        id,
        accountId: input.accountId,
        canPublish: input.canPublish,
        publishMode: input.publishMode,
        riskLevel: input.riskLevel,
        flagsJson: input.flagsJson,
        snapshotAt: input.snapshotAt,
      });
      return { id };
    },

    async getCapability(accountId) {
      const rows = await ctx.db
        .select()
        .from(platformCapability)
        .where(eq(platformCapability.accountId, accountId))
        .limit(1);
      return rows[0] ?? null;
    },
  };
}
