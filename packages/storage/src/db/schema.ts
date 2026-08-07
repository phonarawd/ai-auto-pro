/**
 * Drizzle schema — S2A Storage Contract §2–§3 (25 first-class tables).
 * SQL names: snake_case. Timestamps: ISO-8601 text (s2-b lock).
 */
import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/** ISO-8601 text timestamps — locked for V1 SQLite. */
const isoNow = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

// --- 2.1 Identity & settings ---

export const project = sqliteTable("project", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  metaJson: text("meta_json"),
  createdAt: text("created_at").notNull().default(isoNow),
  updatedAt: text("updated_at").notNull().default(isoNow),
});

export const userSettings = sqliteTable(
  "user_settings",
  {
    id: text("id").primaryKey(),
    userKey: text("user_key").notNull(),
    prefsJson: text("prefs_json").notNull(),
    updatedAt: text("updated_at").notNull().default(isoNow),
  },
  (t) => [uniqueIndex("user_settings_user_key_uidx").on(t.userKey)],
);

export const globalSettings = sqliteTable(
  "global_settings",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    valueJson: text("value_json").notNull(),
    updatedAt: text("updated_at").notNull().default(isoNow),
  },
  (t) => [uniqueIndex("global_settings_key_uidx").on(t.key)],
);

export const projectSettings = sqliteTable(
  "project_settings",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id),
    key: text("key").notNull(),
    valueJson: text("value_json").notNull(),
    updatedAt: text("updated_at").notNull().default(isoNow),
  },
  (t) => [
    uniqueIndex("project_settings_project_key_uidx").on(t.projectId, t.key),
  ],
);

// --- 2.2 Account ---

export const platformAccount = sqliteTable(
  "platform_account",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id),
    platform: text("platform").notNull(),
    displayName: text("display_name").notNull(),
    externalId: text("external_id"),
    status: text("status").notNull(),
    routerTagsJson: text("router_tags_json"),
    createdAt: text("created_at").notNull().default(isoNow),
    updatedAt: text("updated_at").notNull().default(isoNow),
  },
  (t) => [index("platform_account_project_idx").on(t.projectId)],
);

export const accountCredentialRef = sqliteTable(
  "account_credential_ref",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => platformAccount.id),
    vaultRef: text("vault_ref").notNull(),
    kind: text("kind").notNull(),
    createdAt: text("created_at").notNull().default(isoNow),
    updatedAt: text("updated_at").notNull().default(isoNow),
  },
  (t) => [index("account_credential_ref_account_idx").on(t.accountId)],
);

export const sessionRecord = sqliteTable(
  "session_record",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => platformAccount.id),
    status: text("status").notNull(),
    expiresAt: text("expires_at"),
    lastUsedAt: text("last_used_at"),
    encryptedBlobRef: text("encrypted_blob_ref"),
    metaJson: text("meta_json"),
    createdAt: text("created_at").notNull().default(isoNow),
    updatedAt: text("updated_at").notNull().default(isoNow),
  },
  (t) => [index("session_record_account_idx").on(t.accountId)],
);

export const platformCapability = sqliteTable(
  "platform_capability",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => platformAccount.id),
    canPublish: integer("can_publish").notNull(),
    publishMode: text("publish_mode").notNull(),
    riskLevel: text("risk_level").notNull(),
    flagsJson: text("flags_json").notNull(),
    snapshotAt: text("snapshot_at").notNull(),
  },
  (t) => [uniqueIndex("platform_capability_account_uidx").on(t.accountId)],
);

export const connectorRegistration = sqliteTable(
  "connector_registration",
  {
    id: text("id").primaryKey(),
    connectorId: text("connector_id").notNull(),
    version: text("version").notNull(),
    lifecycle: text("lifecycle").notNull(),
    manifestJson: text("manifest_json").notNull(),
    registeredAt: text("registered_at").notNull().default(isoNow),
    updatedAt: text("updated_at").notNull().default(isoNow),
  },
  (t) => [uniqueIndex("connector_registration_connector_uidx").on(t.connectorId)],
);

// --- 2.3 Growth / work ---

export const mission = sqliteTable(
  "mission",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id),
    missionDate: text("mission_date").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull(),
    priority: integer("priority").notNull(),
    decisionId: text("decision_id"),
    payloadJson: text("payload_json").notNull(),
    createdAt: text("created_at").notNull().default(isoNow),
    updatedAt: text("updated_at").notNull().default(isoNow),
  },
  (t) => [
    index("mission_project_date_idx").on(t.projectId, t.missionDate),
  ],
);

export const decisionRecord = sqliteTable(
  "decision_record",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id),
    decidedAt: text("decided_at").notNull(),
    missionId: text("mission_id"),
    graphJson: text("graph_json").notNull(),
    narrative: text("narrative"),
    createdAt: text("created_at").notNull().default(isoNow),
  },
  (t) => [index("decision_record_project_idx").on(t.projectId)],
);

export const plannerQueueItem = sqliteTable(
  "planner_queue_item",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id),
    priority: integer("priority").notNull(),
    deadline: text("deadline"),
    expectedRoi: real("expected_roi"),
    dependencyIdsJson: text("dependency_ids_json").notNull(),
    retryCount: integer("retry_count").notNull().default(0),
    humanApproval: integer("human_approval").notNull().default(0),
    decisionId: text("decision_id"),
    missionId: text("mission_id"),
    payloadJson: text("payload_json").notNull(),
    status: text("status").notNull(),
    leasedBy: text("leased_by"),
    leasedAt: text("leased_at"),
    /** B3 lease TTL — ISO-8601; null when not leased (B3A §2.2). */
    leaseExpiresAt: text("lease_expires_at"),
    createdAt: text("created_at").notNull().default(isoNow),
    updatedAt: text("updated_at").notNull().default(isoNow),
  },
  (t) => [
    index("planner_queue_item_project_status_idx").on(t.projectId, t.status),
  ],
);

// --- 2.4 Content / workflow ---

export const workflowRun = sqliteTable(
  "workflow_run",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id),
    queueItemId: text("queue_item_id"),
    missionId: text("mission_id"),
    decisionId: text("decision_id"),
    dslJson: text("dsl_json").notNull(),
    state: text("state").notNull(),
    cursorJson: text("cursor_json"),
    traceId: text("trace_id").notNull(),
    /** B3 optimistic SM lock — monotonic (B3A §2.1). */
    version: integer("version").notNull().default(1),
    createdAt: text("created_at").notNull().default(isoNow),
    updatedAt: text("updated_at").notNull().default(isoNow),
  },
  (t) => [
    index("workflow_run_project_idx").on(t.projectId),
    index("workflow_run_trace_idx").on(t.traceId),
  ],
);

export const contentItem = sqliteTable(
  "content_item",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id),
    workflowRunId: text("workflow_run_id"),
    targetAccountId: text("target_account_id"),
    channel: text("channel").notNull(),
    format: text("format").notNull(),
    status: text("status").notNull(),
    artifactRef: text("artifact_ref"),
    metaJson: text("meta_json").notNull(),
    createdAt: text("created_at").notNull().default(isoNow),
    updatedAt: text("updated_at").notNull().default(isoNow),
  },
  (t) => [index("content_item_project_idx").on(t.projectId)],
);

export const publishingHistoryEvent = sqliteTable(
  "publishing_history_event",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id),
    contentItemId: text("content_item_id"),
    accountId: text("account_id"),
    kind: text("kind").notNull(),
    publishMode: text("publish_mode"),
    exportPath: text("export_path"),
    externalPostId: text("external_post_id"),
    metaJson: text("meta_json"),
    occurredAt: text("occurred_at").notNull(),
  },
  (t) => [
    index("publishing_history_event_project_idx").on(t.projectId),
  ],
);

// --- 2.5 Knowledge / events / analytics ---

export const knowledgeItem = sqliteTable(
  "knowledge_item",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id),
    namespace: text("namespace").notNull(),
    type: text("type").notNull(),
    tagsJson: text("tags_json").notNull(),
    body: text("body"),
    blobRef: text("blob_ref"),
    evolutionJson: text("evolution_json"),
    createdAt: text("created_at").notNull().default(isoNow),
    updatedAt: text("updated_at").notNull().default(isoNow),
  },
  (t) => [
    index("knowledge_item_project_ns_idx").on(t.projectId, t.namespace),
  ],
);

export const eventOutbox = sqliteTable(
  "event_outbox",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id"),
    type: text("type").notNull(),
    payloadJson: text("payload_json").notNull(),
    traceId: text("trace_id").notNull(),
    occurredAt: text("occurred_at").notNull(),
    publishedAt: text("published_at"),
    attempts: integer("attempts").notNull().default(0),
    status: text("status").notNull(),
  },
  (t) => [index("event_outbox_status_idx").on(t.status)],
);

export const analyticsSnapshot = sqliteTable(
  "analytics_snapshot",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id),
    period: text("period").notNull(),
    metricsJson: text("metrics_json").notNull(),
    capturedAt: text("captured_at").notNull(),
  },
  (t) => [
    uniqueIndex("analytics_snapshot_project_period_uidx").on(
      t.projectId,
      t.period,
    ),
  ],
);

// --- 2.6 Modules / governance / learning ---

export const moduleRegistration = sqliteTable(
  "module_registration",
  {
    id: text("id").primaryKey(),
    moduleId: text("module_id").notNull(),
    version: text("version").notNull(),
    depsJson: text("deps_json").notNull(),
    lifecycle: text("lifecycle").notNull(),
    manifestJson: text("manifest_json").notNull(),
    registeredAt: text("registered_at").notNull().default(isoNow),
    updatedAt: text("updated_at").notNull().default(isoNow),
  },
  (t) => [uniqueIndex("module_registration_module_uidx").on(t.moduleId)],
);

export const featureState = sqliteTable(
  "feature_state",
  {
    id: text("id").primaryKey(),
    featureKey: text("feature_key").notNull(),
    scope: text("scope").notNull(),
    scopeId: text("scope_id"),
    lifecycle: text("lifecycle").notNull(),
    updatedAt: text("updated_at").notNull().default(isoNow),
  },
  (t) => [
    uniqueIndex("feature_state_key_scope_uidx").on(
      t.featureKey,
      t.scope,
      t.scopeId,
    ),
  ],
);

export const policyRule = sqliteTable("policy_rule", {
  id: text("id").primaryKey(),
  featureKey: text("feature_key"),
  scope: text("scope").notNull(),
  scopeId: text("scope_id"),
  ruleJson: text("rule_json").notNull(),
  enabled: integer("enabled").notNull().default(1),
  updatedAt: text("updated_at").notNull().default(isoNow),
});

export const killSwitchState = sqliteTable("kill_switch_state", {
  id: text("id").primaryKey(),
  scope: text("scope").notNull(),
  scopeId: text("scope_id"),
  active: integer("active").notNull().default(0),
  reason: text("reason"),
  activatedAt: text("activated_at"),
  updatedAt: text("updated_at").notNull().default(isoNow),
});

export const auditEvent = sqliteTable(
  "audit_event",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id"),
    kind: text("kind").notNull(),
    actor: text("actor"),
    payloadJson: text("payload_json").notNull(),
    traceId: text("trace_id"),
    occurredAt: text("occurred_at").notNull(),
  },
  (t) => [index("audit_event_project_idx").on(t.projectId)],
);

export const learningPolicy = sqliteTable(
  "learning_policy",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id),
    policyJson: text("policy_json").notNull(),
    confidence: real("confidence").notNull(),
    status: text("status").notNull(),
    updatedAt: text("updated_at").notNull().default(isoNow),
  },
  (t) => [index("learning_policy_project_idx").on(t.projectId)],
);

export const goal = sqliteTable(
  "goal",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id),
    horizon: text("horizon").notNull(),
    title: text("title").notNull(),
    kpiJson: text("kpi_json").notNull(),
    status: text("status").notNull(),
    createdAt: text("created_at").notNull().default(isoNow),
    updatedAt: text("updated_at").notNull().default(isoNow),
  },
  (t) => [index("goal_project_horizon_idx").on(t.projectId, t.horizon)],
);

/** All first-class tables — count must remain 25 (s2-a §2). */
export const schema = {
  project,
  userSettings,
  globalSettings,
  projectSettings,
  platformAccount,
  accountCredentialRef,
  sessionRecord,
  platformCapability,
  connectorRegistration,
  mission,
  decisionRecord,
  plannerQueueItem,
  workflowRun,
  contentItem,
  publishingHistoryEvent,
  knowledgeItem,
  eventOutbox,
  analyticsSnapshot,
  moduleRegistration,
  featureState,
  policyRule,
  killSwitchState,
  auditEvent,
  learningPolicy,
  goal,
} as const;

export const FIRST_CLASS_TABLE_NAMES = [
  "project",
  "user_settings",
  "global_settings",
  "project_settings",
  "platform_account",
  "account_credential_ref",
  "session_record",
  "platform_capability",
  "connector_registration",
  "mission",
  "decision_record",
  "planner_queue_item",
  "workflow_run",
  "content_item",
  "publishing_history_event",
  "knowledge_item",
  "event_outbox",
  "analytics_snapshot",
  "module_registration",
  "feature_state",
  "policy_rule",
  "kill_switch_state",
  "audit_event",
  "learning_policy",
  "goal",
] as const;

export type FirstClassTableName = (typeof FIRST_CLASS_TABLE_NAMES)[number];
