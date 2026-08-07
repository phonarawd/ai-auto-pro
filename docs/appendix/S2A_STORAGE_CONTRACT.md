# S2-A Storage Contract (FROZEN)

**Status:** FROZEN — plan to-do `s2-a` (GROK4.5/256K); **Prove GREEN** (`s2-d` — [`S2D_STORAGE_PROVE.md`](S2D_STORAGE_PROVE.md))
**Normative for:** `s2-b` / `s2-c` implementation (COMPOSER2.5) — implement **this file only**; no scope expansion
**SSOT parents:** [`14_DATABASE.md`](../architecture/14_DATABASE.md), [`02_CONSTITUTION.md`](../architecture/02_CONSTITUTION.md), [`12_INFRASTRUCTURE.md`](../architecture/12_INFRASTRUCTURE.md)

---

## 0. Locks (non-negotiable)

| Lock | Rule |
|---|---|
| Store | V1 = **SQLite only** via **Drizzle** |
| Access | Engines / UI **never** import Drizzle/SQLite; **Repository only** |
| ORM | Drizzle behind Repository — **not Prisma** |
| Cloud DB | **Supabase / Postgres client count = 0** in V1 code & deps |
| Port | `Postgres*Repository` / cloud driver = **interface reserved only** (no impl, no package) |
| Secrets | No plaintext tokens in SQLite; credentials = **vault refs** only |
| Schema | Boundary JSON validated with **Zod** + required `schema_version` |
| Tables | First-class set below is **complete** — do not invent day-1 tables outside this list |
| JSON-until-hot | Shapes in §4 stay JSON columns / KnowledgeItem — not new tables in V1 |
| Seed | Empty project + default Feature/Policy set (no demo spam data) |
| Migrations | Drizzle migrations day-one; additive preferred |

**Forbidden (merge blockers):** Reintroducing Prisma · adding `@supabase/*` / `postgres` client for product data · engine-owned DB clients · parallel Knowledge tables per namespace · 100-entity ER day-one.

---

## 1. Package layout (s2-b must create)

```text
packages/storage/
  package.json                 # @clime/storage — drizzle-orm + better-sqlite3 (or libsql); NOT prisma/supabase
  src/
    index.ts                   # public: createSqliteStorage / repos only
    db/
      client.ts                # Drizzle+SQLite bootstrap (internal)
      schema.ts                # all first-class tables
      migrations/              # drizzle-kit SQL
    ports/                     # interfaces (this contract)
    repos/                     # Sqlite*Repository implementations
    zod/                       # table/JSON boundary schemas (or re-export @clime/shared)
  vitest…
```

Dependency law for `@clime/storage` and the whole workspace V1:

- **Allowed:** `drizzle-orm`, SQLite driver, `zod`, `@clime/shared`
- **Forbidden deps:** any ORM that is not Prisma-negated here — specifically no `@prisma/client` / `prisma` CLI, no `@supabase/supabase-js` / `@supabase/ssr`, no product Postgres pool client. V1 ORM remains Drizzle — not Prisma.

---

## 2. First-class tables — full inventory (25)

SQL table names: **snake_case**. Entity names below match RFC `14`. Count = **25** (RFC 14 lean set — not “14 tables”).

### 2.1 Identity & settings (4)

| # | Entity | SQL table | Purpose |
|---|---|---|---|
| 1 | `Project` | `project` | Root workspace unit |
| 2 | `UserSettings` | `user_settings` | User prefs (values, not governance) |
| 3 | `GlobalSettings` | `global_settings` | Global cascade values |
| 4 | `ProjectSettings` | `project_settings` | Project cascade values |

### 2.2 Account (5)

| # | Entity | SQL table | Purpose |
|---|---|---|---|
| 5 | `PlatformAccount` | `platform_account` | Connected accounts |
| 6 | `AccountCredentialRef` | `account_credential_ref` | Vault refs only |
| 7 | `SessionRecord` | `session_record` | Session lifecycle metadata |
| 8 | `PlatformCapability` | `platform_capability` | Matrix snapshot |
| 9 | `ConnectorRegistration` | `connector_registration` | Lean registry + manifest JSON |

### 2.3 Growth / work (3)

| # | Entity | SQL table | Purpose |
|---|---|---|---|
| 10 | `Mission` | `mission` | Mission Center “today” |
| 11 | `DecisionRecord` | `decision_record` | Daily decision + graph JSON |
| 12 | `PlannerQueueItem` | `planner_queue_item` | Queue buffer |

### 2.4 Content / workflow (3)

| # | Entity | SQL table | Purpose |
|---|---|---|---|
| 13 | `WorkflowRun` | `workflow_run` | DSL run + cursor + Task SM state |
| 14 | `ContentItem` | `content_item` | Artifact metadata |
| 15 | `PublishingHistoryEvent` | `publishing_history_event` | Publish/export history |

### 2.5 Knowledge / events / analytics (3)

| # | Entity | SQL table | Purpose |
|---|---|---|---|
| 16 | `KnowledgeItem` | `knowledge_item` | Unified Knowledge Store |
| 17 | `EventOutbox` | `event_outbox` | At-least-once domain/system events |
| 18 | `AnalyticsSnapshot` | `analytics_snapshot` | Lean rollups |

### 2.6 Modules / governance / learning (7)

| # | Entity | SQL table | Purpose |
|---|---|---|---|
| 19 | `ModuleRegistration` | `module_registration` | Module registry lean row |
| 20 | `FeatureState` | `feature_state` | Feature lifecycle |
| 21 | `PolicyRule` | `policy_rule` | Policy document |
| 22 | `KillSwitchState` | `kill_switch_state` | Kill switch |
| 23 | `AuditEvent` | `audit_event` | Thin audit log |
| 24 | `LearningPolicy` | `learning_policy` | Learning + confidence |
| 25 | `Goal` | `goal` | Goal + KPI JSON (Meta) |

---

## 3. Column map (normative V1)

Conventions:

- `id`: text primary key (ulid/uuid string)
- Timestamps: ISO-8601 text or integer ms — pick one in s2-b and stay consistent (`created_at`, `updated_at`)
- `*_json` columns: TEXT storing JSON; **must** include `schema_version` when they cross package/API boundaries (see §5)
- FK columns are logical; SQLite FK enforcement ON in migrations

### 3.1 `project`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `name` | text | |
| `status` | text | `active` \| `archived` |
| `meta_json` | text null | optional envelope |
| `created_at` | text | |
| `updated_at` | text | |

### 3.2 `user_settings`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `user_key` | text | local owner key (V1 single-user ok) |
| `prefs_json` | text | envelope + prefs |
| `updated_at` | text | |

### 3.3 `global_settings`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `key` | text unique | |
| `value_json` | text | envelope |
| `updated_at` | text | |

### 3.4 `project_settings`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `project_id` | text FK → project | |
| `key` | text | unique per `(project_id, key)` |
| `value_json` | text | envelope |
| `updated_at` | text | |

### 3.5 `platform_account`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `project_id` | text FK | |
| `platform` | text | connector platform id |
| `display_name` | text | |
| `external_id` | text null | |
| `status` | text | `connected` \| `disconnected` \| `error` \| … |
| `router_tags_json` | text null | campaign/router hints |
| `created_at` | text | |
| `updated_at` | text | |

### 3.6 `account_credential_ref`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `account_id` | text FK → platform_account | |
| `vault_ref` | text | **ref only** — never raw secret |
| `kind` | text | `oauth` \| `session` \| `api_key` \| … |
| `created_at` | text | |
| `updated_at` | text | |

### 3.7 `session_record`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `account_id` | text FK | |
| `status` | text | `active` \| `expired` \| `revoked` |
| `expires_at` | text null | |
| `last_used_at` | text null | |
| `encrypted_blob_ref` | text null | points to vault/file — not plaintext session |
| `meta_json` | text null | envelope |
| `created_at` | text | |
| `updated_at` | text | |

### 3.8 `platform_capability`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `account_id` | text FK | one current snapshot per account (unique `account_id`) |
| `can_publish` | integer | 0/1 |
| `publish_mode` | text | `api` \| `session` |
| `risk_level` | text | `low` \| `medium` \| `high` |
| `flags_json` | text | envelope + capability flags |
| `snapshot_at` | text | |

### 3.9 `connector_registration`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `connector_id` | text | manifest id |
| `version` | text | |
| `lifecycle` | text | registered lifecycle |
| `manifest_json` | text | envelope + manifest |
| `registered_at` | text | |
| `updated_at` | text | |

### 3.10 `mission`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `project_id` | text FK | |
| `mission_date` | text | local calendar date for “today” |
| `title` | text | |
| `status` | text | |
| `priority` | integer | |
| `decision_id` | text null | FK soft → decision_record |
| `payload_json` | text | envelope |
| `created_at` | text | |
| `updated_at` | text | |

### 3.11 `decision_record`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `project_id` | text FK | |
| `decided_at` | text | |
| `mission_id` | text null | |
| `graph_json` | text | Decision Graph envelope (V1 Option A — no edge table) |
| `narrative` | text null | |
| `created_at` | text | |

### 3.12 `planner_queue_item`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `project_id` | text FK | |
| `priority` | integer | |
| `deadline` | text null | |
| `expected_roi` | real null | hint only |
| `dependency_ids_json` | text | JSON string array |
| `retry_count` | integer | |
| `human_approval` | integer | 0/1 |
| `decision_id` | text null | |
| `mission_id` | text null | |
| `payload_json` | text | envelope + work descriptor |
| `status` | text | queue/lease states (not full Task SM) |
| `leased_by` | text null | |
| `leased_at` | text null | |
| `created_at` | text | |
| `updated_at` | text | |

### 3.13 `workflow_run`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `project_id` | text FK | |
| `queue_item_id` | text null | |
| `mission_id` | text null | |
| `decision_id` | text null | |
| `dsl_json` | text | Workflow DSL envelope |
| `state` | text | Task SM (§3.13a) |
| `cursor_json` | text null | resume cursor envelope |
| `trace_id` | text | required |
| `created_at` | text | |
| `updated_at` | text | |

#### 3.13a Task state machine values (`workflow_run.state`)

Happy: `QUEUED` → `RUNNING` → `VALIDATING` → `OPTIMIZING` → `READY` → `PUBLISHED`
Terminals: `FAILED` \| `CANCELLED` \| `BLOCKED_HUMAN` \| `BLOCKED_CAPABILITY` \| `BLOCKED_POLICY` \| `PAUSED_CHALLENGE`

### 3.14 `content_item`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `project_id` | text FK | |
| `workflow_run_id` | text null | |
| `target_account_id` | text null | |
| `channel` | text | |
| `format` | text | |
| `status` | text | |
| `artifact_ref` | text null | blob/path ref |
| `meta_json` | text | envelope |
| `created_at` | text | |
| `updated_at` | text | |

### 3.15 `publishing_history_event`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `project_id` | text FK | |
| `content_item_id` | text null | |
| `account_id` | text null | |
| `kind` | text | enum §3.15a |
| `publish_mode` | text null | `api` \| `session` when posted_* |
| `export_path` | text null | when `export` |
| `external_post_id` | text null | |
| `meta_json` | text null | envelope |
| `occurred_at` | text | |

#### 3.15a `kind` enum (fixed)

`draft` \| `export` \| `scheduled` \| `posted_manual` \| `posted_api` \| `posted_session`

### 3.16 `knowledge_item`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `project_id` | text FK | |
| `namespace` | text | e.g. `brand` \| `growth` \| `competitor` \| `system` \| `strategy` |
| `type` | text | doc / pattern / playbook / … |
| `tags_json` | text | JSON array |
| `body` | text null | if JSON body → must carry `schema_version` |
| `blob_ref` | text null | |
| `evolution_json` | text null | scores envelope |
| `created_at` | text | |
| `updated_at` | text | |

### 3.17 `event_outbox`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `project_id` | text null | |
| `type` | text | event type |
| `payload_json` | text | envelope (includes `schema_version`, `traceId`, …) |
| `trace_id` | text | |
| `occurred_at` | text | |
| `published_at` | text null | |
| `attempts` | integer | |
| `status` | text | `pending` \| `published` \| `failed` |

### 3.18 `analytics_snapshot`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `project_id` | text FK | |
| `period` | text | e.g. `2026-08-07` / `2026-W32` |
| `metrics_json` | text | envelope |
| `captured_at` | text | |

### 3.19 `module_registration`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `module_id` | text | |
| `version` | text | |
| `deps_json` | text | |
| `lifecycle` | text | |
| `manifest_json` | text | envelope + Manifest sidecar fields |
| `registered_at` | text | |
| `updated_at` | text | |

### 3.20 `feature_state`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `feature_key` | text | e.g. `feature.missionCenter.start` |
| `scope` | text | `global` \| `project` \| `user` |
| `scope_id` | text null | project/user id when scoped |
| `lifecycle` | text | `enabled` \| `disabled` \| `experimental` \| `beta` \| `hidden` |
| `updated_at` | text | |

Unique: `(feature_key, scope, scope_id)`.

### 3.21 `policy_rule`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `feature_key` | text null | |
| `scope` | text | |
| `scope_id` | text null | |
| `rule_json` | text | envelope |
| `enabled` | integer | 0/1 |
| `updated_at` | text | |

### 3.22 `kill_switch_state`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `scope` | text | |
| `scope_id` | text null | |
| `active` | integer | 0/1 |
| `reason` | text null | |
| `activated_at` | text null | |
| `updated_at` | text | |

### 3.23 `audit_event`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `project_id` | text null | |
| `kind` | text | denial / kill / capability / … |
| `actor` | text null | |
| `payload_json` | text | envelope |
| `trace_id` | text null | |
| `occurred_at` | text | |

### 3.24 `learning_policy`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `project_id` | text FK | |
| `policy_json` | text | envelope |
| `confidence` | real | 0–1 |
| `status` | text | `suggested` \| `active` \| `rejected` |
| `updated_at` | text | |

### 3.25 `goal`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `project_id` | text FK | |
| `horizon` | text | `week` \| `month` \| `quarter` |
| `title` | text | |
| `kpi_json` | text | envelope |
| `status` | text | |
| `created_at` | text | |
| `updated_at` | text | |

---

## 4. JSON-until-hot (not first-class tables)

Persist inside JSON columns / `KnowledgeItem` / blobs — **do not** create tables in V1:

Trend snapshots · Keyword graph · Persona/Emotion · Experiment arms · Brand profile · Research reports · Cost decisions · Resource leases · Wizard state · Funnel raw events · Strategy playbooks (`KnowledgeItem` `namespace=strategy`) · Product/Price/Ad signals

All boundary documents still carry `schema_version`.

---

## 5. Zod + `schema_version` boundary contract

### 5.1 Where Zod runs

| Boundary | Required |
|---|---|
| Repository write of any `*_json` / Knowledge `body` that leaves Storage | parse with Zod |
| Domain API request/response envelopes | Zod (slice 3; reuse shared helpers) |
| Workflow DSL (`dsl_json`, queue `payload_json`) | Zod |
| Event outbox `payload_json` | Zod |
| Export pack manifests (files, not DB) | Zod + `schema_version` |
| Engine → Storage DTO crossing package edge | Zod |

Internal Drizzle row mapping may use inferred types; **untrusted / cross-package JSON must not skip Zod**.

### 5.2 Envelope minimum

```ts
// Normative shape — implemented in @clime/shared (s2-a) and used by storage repos (s2-b)
{
  schema_version: 1,  // number literal; SCHEMA_VERSION in @clime/shared
  ...payload
}
```

Rules:

1. Default `SCHEMA_VERSION = 1` (`@clime/shared`).
2. Readers **reject** unknown / missing `schema_version` at boundaries.
3. Additive field evolution preferred; major bumps require migration note in RFC/appendix.
4. Shared helpers: `withSchemaVersion`, `schemaVersionSchema`, `parseWithSchemaVersion`.

### 5.3 Normative enums (shared Zod)

| Enum | Values |
|---|---|
| `publishMode` | `api` \| `session` |
| `riskLevel` | `low` \| `medium` \| `high` |
| `publishingHistoryKind` | `draft` \| `export` \| `scheduled` \| `posted_manual` \| `posted_api` \| `posted_session` |
| `taskState` | happy path + terminals in §3.13a |
| `featureLifecycle` | `enabled` \| `disabled` \| `experimental` \| `beta` \| `hidden` |
| `settingsScope` | `global` \| `project` \| `user` |
| `goalHorizon` | `week` \| `month` \| `quarter` |

Capability Matrix columns on `platform_capability` use the same `publishMode` / `riskLevel` enums as API/UI — no synonyms.

---

## 6. Repository ports (normative)

Implementations: `Sqlite*Repository` now. Names below are **frozen**; method lists are minimum V1. Cloud twin (`Postgres*Repository`) = port shape only later — **not in V1**.

### 6.1 Port → tables

| Port | Tables |
|---|---|
| `ProjectRepository` | `project` |
| `SettingsRepository` | `user_settings`, `global_settings`, `project_settings` |
| `AccountRepository` | `platform_account`, `account_credential_ref`, `session_record`, `platform_capability` |
| `ConnectorRepository` | `connector_registration` |
| `ModuleRepository` | `module_registration` |
| `MissionRepository` | `mission` |
| `DecisionRepository` | `decision_record` |
| `PlannerQueueRepository` | `planner_queue_item` |
| `WorkflowRunRepository` | `workflow_run` |
| `ContentRepository` | `content_item`, `publishing_history_event` |
| `KnowledgeRepository` | `knowledge_item` |
| `EventOutboxRepository` | `event_outbox` |
| `AnalyticsRepository` | `analytics_snapshot` |
| `FeatureRepository` | `feature_state` |
| `PolicyRepository` | `policy_rule`, `kill_switch_state` |
| `AuditRepository` | `audit_event` |
| `LearningRepository` | `learning_policy` |
| `GoalRepository` | `goal` |

### 6.2 Minimum methods (TypeScript port signatures)

```ts
// packages/storage/src/ports/*.ts — s2-b must match names

export interface ProjectRepository {
  create(input: { name: string; status?: "active" | "archived" }): Promise<{ id: string }>;
  getById(id: string): Promise<ProjectRow | null>;
  list(): Promise<ProjectRow[]>;
  update(id: string, patch: Partial<Pick<ProjectRow, "name" | "status" | "meta_json">>): Promise<void>;
}

export interface SettingsRepository {
  getUserPrefs(userKey: string): Promise<UserSettingsRow | null>;
  putUserPrefs(userKey: string, prefsJson: string): Promise<void>;
  getGlobal(key: string): Promise<GlobalSettingsRow | null>;
  putGlobal(key: string, valueJson: string): Promise<void>;
  getProject(projectId: string, key: string): Promise<ProjectSettingsRow | null>;
  putProject(projectId: string, key: string, valueJson: string): Promise<void>;
}

export interface AccountRepository {
  createAccount(input: Omit<PlatformAccountRow, "id" | "created_at" | "updated_at">): Promise<{ id: string }>;
  getAccount(id: string): Promise<PlatformAccountRow | null>;
  listAccounts(projectId: string): Promise<PlatformAccountRow[]>;
  putCredentialRef(input: Omit<AccountCredentialRefRow, "id" | "created_at" | "updated_at">): Promise<{ id: string }>;
  listCredentialRefs(accountId: string): Promise<AccountCredentialRefRow[]>;
  upsertSession(input: Omit<SessionRecordRow, "id" | "created_at" | "updated_at"> & { id?: string }): Promise<{ id: string }>;
  getSession(id: string): Promise<SessionRecordRow | null>;
  upsertCapability(input: Omit<PlatformCapabilityRow, "id"> & { id?: string }): Promise<{ id: string }>;
  getCapability(accountId: string): Promise<PlatformCapabilityRow | null>;
}

export interface ConnectorRepository {
  upsert(input: Omit<ConnectorRegistrationRow, "id" | "registered_at" | "updated_at"> & { id?: string }): Promise<{ id: string }>;
  getByConnectorId(connectorId: string): Promise<ConnectorRegistrationRow | null>;
  list(): Promise<ConnectorRegistrationRow[]>;
}

export interface ModuleRepository {
  upsert(input: Omit<ModuleRegistrationRow, "id" | "registered_at" | "updated_at"> & { id?: string }): Promise<{ id: string }>;
  getByModuleId(moduleId: string): Promise<ModuleRegistrationRow | null>;
  list(): Promise<ModuleRegistrationRow[]>;
}

export interface MissionRepository {
  create(input: Omit<MissionRow, "id" | "created_at" | "updated_at">): Promise<{ id: string }>;
  getById(id: string): Promise<MissionRow | null>;
  listByDate(projectId: string, missionDate: string): Promise<MissionRow[]>;
  update(id: string, patch: Partial<MissionRow>): Promise<void>;
}

export interface DecisionRepository {
  create(input: Omit<DecisionRecordRow, "id" | "created_at">): Promise<{ id: string }>;
  getById(id: string): Promise<DecisionRecordRow | null>;
  latestForProject(projectId: string): Promise<DecisionRecordRow | null>;
}

export interface PlannerQueueRepository {
  enqueue(input: Omit<PlannerQueueItemRow, "id" | "created_at" | "updated_at">): Promise<{ id: string }>;
  getById(id: string): Promise<PlannerQueueItemRow | null>;
  listReady(projectId: string, limit: number): Promise<PlannerQueueItemRow[]>;
  lease(id: string, workerId: string, at: string): Promise<boolean>;
  updateStatus(id: string, status: string): Promise<void>;
}

export interface WorkflowRunRepository {
  create(input: Omit<WorkflowRunRow, "id" | "created_at" | "updated_at">): Promise<{ id: string }>;
  getById(id: string): Promise<WorkflowRunRow | null>;
  transition(id: string, state: TaskState, cursorJson?: string | null): Promise<void>;
  listByProject(projectId: string, limit: number): Promise<WorkflowRunRow[]>;
}

export interface ContentRepository {
  createItem(input: Omit<ContentItemRow, "id" | "created_at" | "updated_at">): Promise<{ id: string }>;
  getItem(id: string): Promise<ContentItemRow | null>;
  updateItem(id: string, patch: Partial<ContentItemRow>): Promise<void>;
  appendHistory(input: Omit<PublishingHistoryEventRow, "id">): Promise<{ id: string }>;
  listHistory(projectId: string, limit: number): Promise<PublishingHistoryEventRow[]>;
}

export interface KnowledgeRepository {
  upsert(input: Omit<KnowledgeItemRow, "id" | "created_at" | "updated_at"> & { id?: string }): Promise<{ id: string }>;
  getById(id: string): Promise<KnowledgeItemRow | null>;
  list(projectId: string, filter?: { namespace?: string; type?: string }): Promise<KnowledgeItemRow[]>;
  remove(id: string): Promise<void>;
}

export interface EventOutboxRepository {
  enqueue(input: Omit<EventOutboxRow, "id" | "published_at" | "attempts">): Promise<{ id: string }>;
  listPending(limit: number): Promise<EventOutboxRow[]>;
  markPublished(id: string, publishedAt: string): Promise<void>;
  markFailed(id: string, attempts: number): Promise<void>;
}

export interface AnalyticsRepository {
  putSnapshot(input: Omit<AnalyticsSnapshotRow, "id"> & { id?: string }): Promise<{ id: string }>;
  getSnapshot(projectId: string, period: string): Promise<AnalyticsSnapshotRow | null>;
}

export interface FeatureRepository {
  get(featureKey: string, scope: SettingsScope, scopeId?: string | null): Promise<FeatureStateRow | null>;
  put(input: Omit<FeatureStateRow, "id" | "updated_at"> & { id?: string }): Promise<{ id: string }>;
  list(scope?: SettingsScope, scopeId?: string | null): Promise<FeatureStateRow[]>;
}

export interface PolicyRepository {
  putRule(input: Omit<PolicyRuleRow, "id" | "updated_at"> & { id?: string }): Promise<{ id: string }>;
  listRules(scope?: string, scopeId?: string | null): Promise<PolicyRuleRow[]>;
  getKillSwitch(scope: string, scopeId?: string | null): Promise<KillSwitchStateRow | null>;
  setKillSwitch(input: Omit<KillSwitchStateRow, "id" | "updated_at"> & { id?: string }): Promise<{ id: string }>;
}

export interface AuditRepository {
  append(input: Omit<AuditEventRow, "id">): Promise<{ id: string }>;
  list(projectId: string | null, limit: number): Promise<AuditEventRow[]>;
}

export interface LearningRepository {
  put(input: Omit<LearningPolicyRow, "id" | "updated_at"> & { id?: string }): Promise<{ id: string }>;
  getById(id: string): Promise<LearningPolicyRow | null>;
  list(projectId: string): Promise<LearningPolicyRow[]>;
}

export interface GoalRepository {
  create(input: Omit<GoalRow, "id" | "created_at" | "updated_at">): Promise<{ id: string }>;
  getById(id: string): Promise<GoalRow | null>;
  list(projectId: string, horizon?: GoalHorizon): Promise<GoalRow[]>;
  update(id: string, patch: Partial<GoalRow>): Promise<void>;
}

/** Facade returned by createSqliteStorage() */
export interface ClimeStorage {
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
```

`*Row` types = column maps in §3 (camelCase or snake_case in TS — pick one in s2-b; prefer camelCase in TS + snake in SQL).

---

## 7. Migrations & seed (s2-b)

1. Generate Drizzle migrations covering **all 25** tables in one initial migration (or ordered additive set that ends at 25).
2. Seed transaction:
   - no project required to open app; first project may be created by Wizard later
   - insert default `feature_state` + baseline `policy_rule` rows needed for Feature→Policy→Runtime (slice 2.5)
3. DB file location: app user-data path (Electron); tests use temp file / `:memory:` if driver allows.

---

## 8. Explicit non-goals (out of s2-a/b/c)

- Postgres/Supabase driver implementation
- Vector / full-text extensions
- `DecisionGraphEdge` table (stay on `graph_json`)
- Memory episodes first-class table (Memory package may use JSON/Knowledge later — not this slice)
- Domain API / buses / UI

---

## 9. Prove checklist (for s2-d)

- [x] All 25 tables present in Drizzle schema + migration
- [x] Every Repository port implemented for SQLite
- [x] Zod parse on JSON boundary writes
- [x] `schema_version` present on envelope fixtures/tests
- [x] Workspace deps: Drizzle only — not Prisma; Supabase client count = 0
- [x] No engine package imports `drizzle-orm` / sqlite driver
- [x] `pnpm lint` / `typecheck` / `test` GREEN

Full stamp → [`S2D_STORAGE_PROVE.md`](S2D_STORAGE_PROVE.md).

---

## 10. Handoff

| Field | Value |
|---|---|
| Contract id | `s2-a` |
| Implement | `s2-b` / `s2-c` — **done** (`packages/storage`) |
| Prove | `s2-d` — **GREEN** |
| Next to-do | `s2.5-a` |
| Recommended model | GROK4.5 |
| Do not | Expand table list · Reintroducing Prisma / adding Supabase client · skip Feature→Policy→Runtime gate |
