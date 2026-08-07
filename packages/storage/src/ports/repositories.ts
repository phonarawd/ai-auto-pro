/**
 * Repository ports — frozen names/methods from s2-a §6.
 * SQLite implementations: `createSqliteStorage()` (s2-c).
 */
import type {
  GoalHorizon,
  SettingsScope,
  TaskState,
} from "@clime/shared";
import type {
  AccountCredentialRefRow,
  AnalyticsSnapshotRow,
  AuditEventRow,
  ConnectorRegistrationRow,
  ContentItemRow,
  DecisionRecordRow,
  EventOutboxRow,
  FeatureStateRow,
  GlobalSettingsRow,
  GoalRow,
  KillSwitchStateRow,
  KnowledgeItemRow,
  LearningPolicyRow,
  MissionRow,
  ModuleRegistrationRow,
  PlatformAccountRow,
  PlatformCapabilityRow,
  PlannerQueueItemRow,
  PolicyRuleRow,
  ProjectRow,
  ProjectSettingsRow,
  PublishingHistoryEventRow,
  SessionRecordRow,
  UserSettingsRow,
  WorkflowRunRow,
} from "./types.js";

export interface ProjectRepository {
  create(input: {
    name: string;
    status?: "active" | "archived";
  }): Promise<{ id: string }>;
  getById(id: string): Promise<ProjectRow | null>;
  list(): Promise<ProjectRow[]>;
  update(
    id: string,
    patch: Partial<Pick<ProjectRow, "name" | "status" | "metaJson">>,
  ): Promise<void>;
}

export interface SettingsRepository {
  getUserPrefs(userKey: string): Promise<UserSettingsRow | null>;
  putUserPrefs(userKey: string, prefsJson: string): Promise<void>;
  getGlobal(key: string): Promise<GlobalSettingsRow | null>;
  putGlobal(key: string, valueJson: string): Promise<void>;
  listGlobal(): Promise<GlobalSettingsRow[]>;
  getProject(
    projectId: string,
    key: string,
  ): Promise<ProjectSettingsRow | null>;
  putProject(
    projectId: string,
    key: string,
    valueJson: string,
  ): Promise<void>;
  listProject(projectId: string): Promise<ProjectSettingsRow[]>;
}

export interface AccountRepository {
  createAccount(
    input: Omit<PlatformAccountRow, "id" | "createdAt" | "updatedAt"> & {
      id?: string;
    },
  ): Promise<{ id: string }>;
  getAccount(id: string): Promise<PlatformAccountRow | null>;
  listAccounts(projectId: string): Promise<PlatformAccountRow[]>;
  putCredentialRef(
    input: Omit<AccountCredentialRefRow, "id" | "createdAt" | "updatedAt">,
  ): Promise<{ id: string }>;
  listCredentialRefs(accountId: string): Promise<AccountCredentialRefRow[]>;
  upsertSession(
    input: Omit<SessionRecordRow, "id" | "createdAt" | "updatedAt"> & {
      id?: string;
    },
  ): Promise<{ id: string }>;
  getSession(id: string): Promise<SessionRecordRow | null>;
  upsertCapability(
    input: Omit<PlatformCapabilityRow, "id"> & { id?: string },
  ): Promise<{ id: string }>;
  getCapability(accountId: string): Promise<PlatformCapabilityRow | null>;
}

export interface ConnectorRepository {
  upsert(
    input: Omit<
      ConnectorRegistrationRow,
      "id" | "registeredAt" | "updatedAt"
    > & { id?: string },
  ): Promise<{ id: string }>;
  getByConnectorId(
    connectorId: string,
  ): Promise<ConnectorRegistrationRow | null>;
  list(): Promise<ConnectorRegistrationRow[]>;
}

export interface ModuleRepository {
  upsert(
    input: Omit<
      ModuleRegistrationRow,
      "id" | "registeredAt" | "updatedAt"
    > & { id?: string },
  ): Promise<{ id: string }>;
  getByModuleId(moduleId: string): Promise<ModuleRegistrationRow | null>;
  list(): Promise<ModuleRegistrationRow[]>;
}

export interface MissionRepository {
  create(
    input: Omit<MissionRow, "id" | "createdAt" | "updatedAt">,
  ): Promise<{ id: string }>;
  getById(id: string): Promise<MissionRow | null>;
  listByDate(projectId: string, missionDate: string): Promise<MissionRow[]>;
  update(id: string, patch: Partial<MissionRow>): Promise<void>;
}

export interface DecisionRepository {
  create(
    input: Omit<DecisionRecordRow, "id" | "createdAt">,
  ): Promise<{ id: string }>;
  getById(id: string): Promise<DecisionRecordRow | null>;
  latestForProject(projectId: string): Promise<DecisionRecordRow | null>;
}

export type WorkflowTransitionResult =
  | { ok: true; version: number; updatedAt: string }
  | { ok: false; reason: "not_found" | "conflict" };

export interface PlannerQueueRepository {
  enqueue(
    input: Omit<PlannerQueueItemRow, "id" | "createdAt" | "updatedAt">,
  ): Promise<{ id: string }>;
  getById(id: string): Promise<PlannerQueueItemRow | null>;
  listReady(projectId: string, limit: number): Promise<PlannerQueueItemRow[]>;
  /** Project scan for Kill Switch cancel (s2.5) — includes leased/ready/etc. */
  listByProject(
    projectId: string,
    limit: number,
  ): Promise<PlannerQueueItemRow[]>;
  /**
   * Atomic ready→leased with lease_expires_at (B3A §2.3 / §5.3).
   * `leaseExpiresAt` required for B3 workers; callers must pass ISO-8601.
   */
  lease(
    id: string,
    workerId: string,
    at: string,
    leaseExpiresAt: string,
  ): Promise<boolean>;
  /** Extend lease TTL while still leased by workerId. */
  heartbeat(
    id: string,
    workerId: string,
    leaseExpiresAt: string,
  ): Promise<boolean>;
  /** Zombie reclaim: leased + expired → ready. */
  reclaimExpired(now: string): Promise<string[]>;
  updateStatus(id: string, status: string): Promise<void>;
}

export interface WorkflowRunRepository {
  create(
    input: Omit<WorkflowRunRow, "id" | "createdAt" | "updatedAt" | "version"> & {
      version?: number;
    },
  ): Promise<{ id: string }>;
  getById(id: string): Promise<WorkflowRunRow | null>;
  /**
   * Optimistic SM transition using current row version+updated_at (B3A §2.3).
   * Conflict → ok:false (no silent overwrite).
   */
  transition(
    id: string,
    state: TaskState,
    cursorJson?: string | null,
  ): Promise<WorkflowTransitionResult>;
  /** Explicit optimistic lock — caller supplies expected version + updated_at. */
  transitionWithLock(
    id: string,
    input: {
      expectedVersion: number;
      expectedUpdatedAt: string;
      state: TaskState;
      cursorJson?: string | null;
    },
  ): Promise<WorkflowTransitionResult>;
  listByProject(projectId: string, limit: number): Promise<WorkflowRunRow[]>;
}

export interface ContentRepository {
  createItem(
    input: Omit<ContentItemRow, "id" | "createdAt" | "updatedAt">,
  ): Promise<{ id: string }>;
  getItem(id: string): Promise<ContentItemRow | null>;
  updateItem(id: string, patch: Partial<ContentItemRow>): Promise<void>;
  appendHistory(
    input: Omit<PublishingHistoryEventRow, "id">,
  ): Promise<{ id: string }>;
  listHistory(
    projectId: string,
    limit: number,
  ): Promise<PublishingHistoryEventRow[]>;
}

export interface KnowledgeRepository {
  upsert(
    input: Omit<KnowledgeItemRow, "id" | "createdAt" | "updatedAt"> & {
      id?: string;
    },
  ): Promise<{ id: string }>;
  getById(id: string): Promise<KnowledgeItemRow | null>;
  list(
    projectId: string,
    filter?: { namespace?: string; type?: string },
  ): Promise<KnowledgeItemRow[]>;
  remove(id: string): Promise<void>;
}

export interface EventOutboxRepository {
  enqueue(
    input: Omit<EventOutboxRow, "id" | "publishedAt" | "attempts">,
  ): Promise<{ id: string }>;
  listPending(limit: number): Promise<EventOutboxRow[]>;
  markPublished(id: string, publishedAt: string): Promise<void>;
  markFailed(id: string, attempts: number): Promise<void>;
}

export interface AnalyticsRepository {
  putSnapshot(
    input: Omit<AnalyticsSnapshotRow, "id"> & { id?: string },
  ): Promise<{ id: string }>;
  getSnapshot(
    projectId: string,
    period: string,
  ): Promise<AnalyticsSnapshotRow | null>;
}

export interface FeatureRepository {
  get(
    featureKey: string,
    scope: SettingsScope,
    scopeId?: string | null,
  ): Promise<FeatureStateRow | null>;
  put(
    input: Omit<FeatureStateRow, "id" | "updatedAt"> & { id?: string },
  ): Promise<{ id: string }>;
  list(
    scope?: SettingsScope,
    scopeId?: string | null,
  ): Promise<FeatureStateRow[]>;
}

export interface PolicyRepository {
  putRule(
    input: Omit<PolicyRuleRow, "id" | "updatedAt"> & { id?: string },
  ): Promise<{ id: string }>;
  listRules(
    scope?: string,
    scopeId?: string | null,
  ): Promise<PolicyRuleRow[]>;
  getKillSwitch(
    scope: string,
    scopeId?: string | null,
  ): Promise<KillSwitchStateRow | null>;
  setKillSwitch(
    input: Omit<KillSwitchStateRow, "id" | "updatedAt"> & { id?: string },
  ): Promise<{ id: string }>;
}

export interface AuditRepository {
  append(input: Omit<AuditEventRow, "id">): Promise<{ id: string }>;
  list(projectId: string | null, limit: number): Promise<AuditEventRow[]>;
}

export interface LearningRepository {
  put(
    input: Omit<LearningPolicyRow, "id" | "updatedAt"> & { id?: string },
  ): Promise<{ id: string }>;
  getById(id: string): Promise<LearningPolicyRow | null>;
  list(projectId: string): Promise<LearningPolicyRow[]>;
}

export interface GoalRepository {
  create(
    input: Omit<GoalRow, "id" | "createdAt" | "updatedAt">,
  ): Promise<{ id: string }>;
  getById(id: string): Promise<GoalRow | null>;
  list(projectId: string, horizon?: GoalHorizon): Promise<GoalRow[]>;
  update(id: string, patch: Partial<GoalRow>): Promise<void>;
}

/**
 * Repository ports available inside `runAtomicWrite` (s2-e-a §6).
 * Writes participate in the same BEGIN IMMEDIATE transaction.
 */
export interface ClimeStorageUnitOfWork {
  projects: ProjectRepository;
  settings: SettingsRepository;
  accounts: AccountRepository;
  connectors: ConnectorRepository;
  modules: ModuleRepository;
  missions: MissionRepository;
  decisions: DecisionRepository;
  plannerQueue: PlannerQueueRepository;
  workflowRuns: WorkflowRunRepository;
  content: ContentRepository;
  knowledge: KnowledgeRepository;
  eventOutbox: EventOutboxRepository;
  analytics: AnalyticsRepository;
  features: FeatureRepository;
  policies: PolicyRepository;
  audit: AuditRepository;
  learning: LearningRepository;
  goals: GoalRepository;
}

/** Facade returned by createSqliteStorage(). */
export interface ClimeStorage extends ClimeStorageUnitOfWork {
  /**
   * Acquire per-handle async mutex → BEGIN IMMEDIATE → run `work` → COMMIT.
   * On throw: ROLLBACK; rethrow. Nested calls join the same txn+mutex (s2-e-a §6).
   *
   * Domain-fact + EventOutbox pairs MUST call `eventOutbox.enqueue` inside `work`.
   */
  runAtomicWrite<T>(
    work: (uow: ClimeStorageUnitOfWork) => Promise<T> | T,
  ): Promise<T>;
}
