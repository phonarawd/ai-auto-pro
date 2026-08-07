import { and, desc, eq, isNull } from "drizzle-orm";
import {
  featureLifecycleSchema,
  goalHorizonSchema,
  settingsScopeSchema,
  type GoalHorizon,
  type SettingsScope,
} from "@clime/shared";
import {
  auditEvent,
  featureState,
  goal,
  killSwitchState,
  learningPolicy,
  policyRule,
} from "../db/schema.js";
import type {
  AuditRepository,
  FeatureRepository,
  GoalRepository,
  LearningRepository,
  PolicyRepository,
} from "../ports/repositories.js";
import {
  assertJsonEnvelope,
  newId,
  nowIso,
  type RepoContext,
  stripUndefined,
} from "./helpers.js";

function scopeIdMatch(
  column: typeof featureState.scopeId | typeof policyRule.scopeId | typeof killSwitchState.scopeId,
  scopeId: string | null | undefined,
) {
  if (scopeId == null) return isNull(column);
  return eq(column, scopeId);
}

export function createFeatureRepository(ctx: RepoContext): FeatureRepository {
  return {
    async get(featureKey, scope, scopeId) {
      settingsScopeSchema.parse(scope);
      const rows = await ctx.db
        .select()
        .from(featureState)
        .where(
          and(
            eq(featureState.featureKey, featureKey),
            eq(featureState.scope, scope),
            scopeIdMatch(featureState.scopeId, scopeId),
          ),
        )
        .limit(1);
      return rows[0] ?? null;
    },

    async put(input) {
      settingsScopeSchema.parse(input.scope);
      featureLifecycleSchema.parse(input.lifecycle);
      const existing = await this.get(
        input.featureKey,
        input.scope as SettingsScope,
        input.scopeId,
      );
      const now = nowIso();
      if (existing) {
        const id = input.id ?? existing.id;
        await ctx.db
          .update(featureState)
          .set({
            lifecycle: input.lifecycle,
            updatedAt: now,
          })
          .where(eq(featureState.id, existing.id));
        return { id };
      }
      const id = input.id ?? newId();
      await ctx.db.insert(featureState).values({
        id,
        featureKey: input.featureKey,
        scope: input.scope,
        scopeId: input.scopeId ?? null,
        lifecycle: input.lifecycle,
        updatedAt: now,
      });
      return { id };
    },

    async list(scope, scopeId) {
      if (scope == null) {
        return ctx.db.select().from(featureState);
      }
      settingsScopeSchema.parse(scope);
      return ctx.db
        .select()
        .from(featureState)
        .where(
          and(
            eq(featureState.scope, scope),
            scopeIdMatch(featureState.scopeId, scopeId),
          ),
        );
    },
  };
}

export function createPolicyRepository(ctx: RepoContext): PolicyRepository {
  return {
    async putRule(input) {
      assertJsonEnvelope(input.ruleJson, "policyRule.ruleJson");
      const now = nowIso();
      if (input.id) {
        const rows = await ctx.db
          .select()
          .from(policyRule)
          .where(eq(policyRule.id, input.id))
          .limit(1);
        if (rows[0]) {
          await ctx.db
            .update(policyRule)
            .set({
              featureKey: input.featureKey ?? null,
              scope: input.scope,
              scopeId: input.scopeId ?? null,
              ruleJson: input.ruleJson,
              enabled: input.enabled,
              updatedAt: now,
            })
            .where(eq(policyRule.id, input.id));
          return { id: input.id };
        }
      }
      const id = input.id ?? newId();
      await ctx.db.insert(policyRule).values({
        id,
        featureKey: input.featureKey ?? null,
        scope: input.scope,
        scopeId: input.scopeId ?? null,
        ruleJson: input.ruleJson,
        enabled: input.enabled,
        updatedAt: now,
      });
      return { id };
    },

    async listRules(scope, scopeId) {
      if (scope == null) {
        return ctx.db.select().from(policyRule);
      }
      return ctx.db
        .select()
        .from(policyRule)
        .where(
          and(
            eq(policyRule.scope, scope),
            scopeIdMatch(policyRule.scopeId, scopeId),
          ),
        );
    },

    async getKillSwitch(scope, scopeId) {
      const rows = await ctx.db
        .select()
        .from(killSwitchState)
        .where(
          and(
            eq(killSwitchState.scope, scope),
            scopeIdMatch(killSwitchState.scopeId, scopeId),
          ),
        )
        .limit(1);
      return rows[0] ?? null;
    },

    async setKillSwitch(input) {
      const existing = await this.getKillSwitch(input.scope, input.scopeId);
      const now = nowIso();
      if (existing) {
        const id = input.id ?? existing.id;
        await ctx.db
          .update(killSwitchState)
          .set({
            active: input.active,
            reason: input.reason ?? null,
            activatedAt: input.activatedAt ?? null,
            updatedAt: now,
          })
          .where(eq(killSwitchState.id, existing.id));
        return { id };
      }
      const id = input.id ?? newId();
      await ctx.db.insert(killSwitchState).values({
        id,
        scope: input.scope,
        scopeId: input.scopeId ?? null,
        active: input.active,
        reason: input.reason ?? null,
        activatedAt: input.activatedAt ?? null,
        updatedAt: now,
      });
      return { id };
    },
  };
}

export function createAuditRepository(ctx: RepoContext): AuditRepository {
  return {
    async append(input) {
      assertJsonEnvelope(input.payloadJson, "auditEvent.payloadJson");
      const id = newId();
      await ctx.db.insert(auditEvent).values({
        id,
        projectId: input.projectId ?? null,
        kind: input.kind,
        actor: input.actor ?? null,
        payloadJson: input.payloadJson,
        traceId: input.traceId ?? null,
        occurredAt: input.occurredAt,
      });
      return { id };
    },

    async list(projectId, limit) {
      if (projectId == null) {
        return ctx.db
          .select()
          .from(auditEvent)
          .orderBy(desc(auditEvent.occurredAt))
          .limit(limit);
      }
      return ctx.db
        .select()
        .from(auditEvent)
        .where(eq(auditEvent.projectId, projectId))
        .orderBy(desc(auditEvent.occurredAt))
        .limit(limit);
    },
  };
}

export function createLearningRepository(
  ctx: RepoContext,
): LearningRepository {
  return {
    async put(input) {
      assertJsonEnvelope(input.policyJson, "learningPolicy.policyJson");
      const now = nowIso();
      if (input.id) {
        const existing = await this.getById(input.id);
        if (existing) {
          await ctx.db
            .update(learningPolicy)
            .set({
              projectId: input.projectId,
              policyJson: input.policyJson,
              confidence: input.confidence,
              status: input.status,
              updatedAt: now,
            })
            .where(eq(learningPolicy.id, input.id));
          return { id: input.id };
        }
      }
      const id = input.id ?? newId();
      await ctx.db.insert(learningPolicy).values({
        id,
        projectId: input.projectId,
        policyJson: input.policyJson,
        confidence: input.confidence,
        status: input.status,
        updatedAt: now,
      });
      return { id };
    },

    async getById(id) {
      const rows = await ctx.db
        .select()
        .from(learningPolicy)
        .where(eq(learningPolicy.id, id))
        .limit(1);
      return rows[0] ?? null;
    },

    async list(projectId) {
      return ctx.db
        .select()
        .from(learningPolicy)
        .where(eq(learningPolicy.projectId, projectId));
    },
  };
}

export function createGoalRepository(ctx: RepoContext): GoalRepository {
  return {
    async create(input) {
      goalHorizonSchema.parse(input.horizon);
      assertJsonEnvelope(input.kpiJson, "goal.kpiJson");
      const id = newId();
      const now = nowIso();
      await ctx.db.insert(goal).values({
        id,
        projectId: input.projectId,
        horizon: input.horizon,
        title: input.title,
        kpiJson: input.kpiJson,
        status: input.status,
        createdAt: now,
        updatedAt: now,
      });
      return { id };
    },

    async getById(id) {
      const rows = await ctx.db
        .select()
        .from(goal)
        .where(eq(goal.id, id))
        .limit(1);
      return rows[0] ?? null;
    },

    async list(projectId, horizon?: GoalHorizon) {
      if (horizon) {
        goalHorizonSchema.parse(horizon);
        return ctx.db
          .select()
          .from(goal)
          .where(and(eq(goal.projectId, projectId), eq(goal.horizon, horizon)));
      }
      return ctx.db
        .select()
        .from(goal)
        .where(eq(goal.projectId, projectId));
    },

    async update(id, patch) {
      const cleaned = stripUndefined(patch);
      if (cleaned.horizon != null) {
        goalHorizonSchema.parse(cleaned.horizon);
      }
      if (cleaned.kpiJson != null) {
        assertJsonEnvelope(cleaned.kpiJson, "goal.kpiJson");
      }
      delete cleaned.id;
      if (Object.keys(cleaned).length === 0) return;
      await ctx.db
        .update(goal)
        .set({ ...cleaned, updatedAt: nowIso() })
        .where(eq(goal.id, id));
    },
  };
}
