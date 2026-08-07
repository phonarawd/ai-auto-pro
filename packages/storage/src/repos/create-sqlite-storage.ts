import type Database from "better-sqlite3";
import {
  openSqliteDatabase,
  type ClimeSqliteDatabase,
  type OpenSqliteOptions,
} from "../db/client.js";
import { migrateSqliteDatabase } from "../db/migrate.js";
import type {
  ClimeStorage,
  ClimeStorageUnitOfWork,
} from "../ports/repositories.js";
import { WriteGate, wrapRepositoryMethods } from "../runtime/write-gate.js";
import { seedSqliteDefaults, type SeedResult } from "../seed/seed.js";
import { createAccountRepository } from "./account.js";
import {
  createContentRepository,
  createWorkflowRunRepository,
} from "./content-workflow.js";
import {
  createConnectorRepository,
  createModuleRepository,
} from "./connector-module.js";
import {
  createAuditRepository,
  createFeatureRepository,
  createGoalRepository,
  createLearningRepository,
  createPolicyRepository,
} from "./governance.js";
import {
  createDecisionRepository,
  createMissionRepository,
  createPlannerQueueRepository,
} from "./growth.js";
import {
  createAnalyticsRepository,
  createEventOutboxRepository,
  createKnowledgeRepository,
} from "./knowledge-events.js";
import {
  createProjectRepository,
  createSettingsRepository,
} from "./project-settings.js";

export type CreateSqliteStorageOptions = OpenSqliteOptions & {
  /** Apply day-one migrations (default true). */
  migrate?: boolean;
};

export type SqliteStorage = ClimeStorage & {
  /** Close the underlying SQLite connection. */
  close(): void;
  /** Idempotent empty-project + default Feature/Policy seed. */
  seedDefaults(): Promise<SeedResult>;
};

function wireRepos(
  db: ClimeSqliteDatabase,
  sqlite: Database.Database,
): SqliteStorage {
  const gate = new WriteGate(sqlite);
  const ctx = { db };

  const uow: ClimeStorageUnitOfWork = {
    projects: wrapRepositoryMethods(createProjectRepository(ctx), gate),
    settings: wrapRepositoryMethods(createSettingsRepository(ctx), gate),
    accounts: wrapRepositoryMethods(createAccountRepository(ctx), gate),
    connectors: wrapRepositoryMethods(createConnectorRepository(ctx), gate),
    modules: wrapRepositoryMethods(createModuleRepository(ctx), gate),
    missions: wrapRepositoryMethods(createMissionRepository(ctx), gate),
    decisions: wrapRepositoryMethods(createDecisionRepository(ctx), gate),
    plannerQueue: wrapRepositoryMethods(
      createPlannerQueueRepository(ctx),
      gate,
    ),
    workflowRuns: wrapRepositoryMethods(
      createWorkflowRunRepository(ctx),
      gate,
    ),
    content: wrapRepositoryMethods(createContentRepository(ctx), gate),
    knowledge: wrapRepositoryMethods(createKnowledgeRepository(ctx), gate),
    eventOutbox: wrapRepositoryMethods(
      createEventOutboxRepository(ctx),
      gate,
    ),
    analytics: wrapRepositoryMethods(createAnalyticsRepository(ctx), gate),
    features: wrapRepositoryMethods(createFeatureRepository(ctx), gate),
    policies: wrapRepositoryMethods(createPolicyRepository(ctx), gate),
    audit: wrapRepositoryMethods(createAuditRepository(ctx), gate),
    learning: wrapRepositoryMethods(createLearningRepository(ctx), gate),
    goals: wrapRepositoryMethods(createGoalRepository(ctx), gate),
  };

  const storage: SqliteStorage = {
    ...uow,
    runAtomicWrite(work) {
      return gate.runImmediateTransaction(() => work(uow));
    },
    close() {
      sqlite.close();
    },
    seedDefaults() {
      return gate.runExclusive(() => seedSqliteDefaults(storage, db));
    },
  };
  return storage;
}

/**
 * Public factory — engines/UI use Repository ports only (s2-a §1 / §6).
 * Never import drizzle-orm from engine packages.
 */
export function createSqliteStorage(
  options: CreateSqliteStorageOptions,
): SqliteStorage {
  const { sqlite, db } = openSqliteDatabase(options);
  if (options.migrate !== false) {
    migrateSqliteDatabase(db);
  }
  return wireRepos(db, sqlite);
}

/** Open, migrate, and seed (preferred for app boot). */
export async function createAndSeedSqliteStorage(
  options: CreateSqliteStorageOptions,
): Promise<{ storage: SqliteStorage; seed: SeedResult }> {
  const storage = createSqliteStorage(options);
  const seed = await storage.seedDefaults();
  return { storage, seed };
}
