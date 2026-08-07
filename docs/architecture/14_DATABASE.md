# 14 — Database: Lean V1 Entities + JSON · Postgres Port

**Status:** Phase A Storage **PROVED** (`s2-a`→`s2-d` GREEN) — [`S2D_STORAGE_PROVE.md`](../appendix/S2D_STORAGE_PROVE.md); Hardening **PROVED** (`s2-e-a`→`c` GREEN) — [`S2EA_STORAGE_HARDENING_CONTRACT.md`](../appendix/S2EA_STORAGE_HARDENING_CONTRACT.md) + [`S2EC_STORAGE_HARDENING_PROVE.md`](../appendix/S2EC_STORAGE_HARDENING_PROVE.md)
**V1 store:** SQLite via **Drizzle** + Repository pattern
**Implementation SSOT:** [`docs/appendix/S2A_STORAGE_CONTRACT.md`](../appendix/S2A_STORAGE_CONTRACT.md) (tables/ports); hardening → [`S2EA_STORAGE_HARDENING_CONTRACT.md`](../appendix/S2EA_STORAGE_HARDENING_CONTRACT.md)
**Later:** Postgres / Supabase driver behind the **same Repository ports** — not V1

---

## 1. Design law

- Prefer **fewer first-class tables**
- Most other shapes = **JSON columns** / manifests until proven hot
- Full ~100-entity ER is L+/appendix — **not** V1 migration day-1
- Engines never import Drizzle directly (`12_INFRASTRUCTURE.md`)
- Boundary JSON validated with **Zod** + `schema_version`
- ORM is Drizzle behind Repository — **not Prisma**
- V1 product data path: SQLite only — Supabase/Postgres **client count = 0**

---

## 2. First-class tables (SQLite V1) — complete set (25)

Do not abbreviate this list in implementation. Column map, SQL names, enums, and Repository methods are frozen in [`S2A_STORAGE_CONTRACT.md`](../appendix/S2A_STORAGE_CONTRACT.md).

### Identity & settings

| Table | Notes |
|---|---|
| `Project` | Root workspace unit |
| `UserSettings` | User prefs |
| `GlobalSettings` | Cascade values (global) |
| `ProjectSettings` | Cascade values (project) |

### Account

| Table | Notes |
|---|---|
| `PlatformAccount` | Connected accounts |
| `AccountCredentialRef` | Vault refs only |
| `SessionRecord` | Lifecycle metadata |
| `PlatformCapability` | Matrix snapshot: `canPublish`, `publishMode`, `riskLevel`, flags |
| `ConnectorRegistration` | Lean + `manifestJson` |

### Growth / work

| Table | Notes |
|---|---|
| `Mission` | Mission Center |
| `DecisionRecord` | + `graphJson` (V1 Option A; no edge table) |
| `PlannerQueueItem` | Queue buffer |

### Content / workflow

| Table | Notes |
|---|---|
| `WorkflowRun` | DSL run + cursor + Task SM state |
| `ContentItem` | Artifacts metadata |
| `PublishingHistoryEvent` | `draft` / `export` / `scheduled` / `posted_manual` / `posted_api` / `posted_session` |

### Knowledge / events / analytics

| Table | Notes |
|---|---|
| `KnowledgeItem` | `namespace`, `type`, `tags`, `body`/`blobRef`, Evolution scores |
| `EventOutbox` | Reliable publish (at-least-once) |
| `AnalyticsSnapshot` | Lean rollups / metrics JSON |

### Modules / governance / learning

| Table | Notes |
|---|---|
| `ModuleRegistration` | ID/version/deps/lifecycle + Manifest sidecar |
| `FeatureState` | Feature lifecycle |
| `PolicyRule` | Policy JSON/schema |
| `KillSwitchState` | Runtime kill |
| `AuditEvent` | Thin |
| `LearningPolicy` | + confidence |
| `Goal` | + KPI JSON |

---

## 3. Prefer JSON / documents until hot

Trend snapshots · Keyword graph payloads · Persona/Emotion scores · Experiment arms · Brand profile · Research reports · Cost decisions · Resource leases · Wizard state · Funnel raw events · Strategy playbooks (as KnowledgeItem `strategy`) · Product/Price/Ad signals

All JSON documents that cross boundaries carry `schema_version`.

---

## 4. Repository ports (normative)

Frozen in s2-a contract. Grouping:

| Port | Tables |
|---|---|
| `ProjectRepository` | Project |
| `SettingsRepository` | UserSettings, GlobalSettings, ProjectSettings |
| `AccountRepository` | PlatformAccount, AccountCredentialRef, SessionRecord, PlatformCapability |
| `ConnectorRepository` | ConnectorRegistration |
| `ModuleRepository` | ModuleRegistration |
| `MissionRepository` | Mission |
| `DecisionRepository` | DecisionRecord |
| `PlannerQueueRepository` | PlannerQueueItem |
| `WorkflowRunRepository` | WorkflowRun |
| `ContentRepository` | ContentItem, PublishingHistoryEvent |
| `KnowledgeRepository` | KnowledgeItem |
| `EventOutboxRepository` | EventOutbox |
| `AnalyticsRepository` | AnalyticsSnapshot |
| `FeatureRepository` | FeatureState |
| `PolicyRepository` | PolicyRule, KillSwitchState |
| `AuditRepository` | AuditEvent |
| `LearningRepository` | LearningPolicy |
| `GoalRepository` | Goal |

Facade: `ClimeStorage` from `createSqliteStorage()`. Implementations: `Sqlite*Repository` (Drizzle) now → `Postgres*Repository` later (**port only in V1**).

---

## 5. Postgres / Supabase port

| Concern | Approach |
|---|---|
| When | Trend/Graph/Analytics/Memory volume grows (Phase L+) |
| How | New Storage driver + migrations; engines untouched |
| V1 code | **Zero** Supabase/Postgres product clients or deps |
| Auth | Still local Owner V1; cloud auth is separate product decision |
| Realtime | Optional later; not V1 requirement |

---

## 6. Files alongside DB

| Path | Content |
|---|---|
| `Exports/YYYY-MM-DD/` | Export backup packs |
| Blob store | Images, thumbnails, large reports |
| Vault | Encrypted secrets (not SQLite plaintext) |
| Logs | Observability files / sinks |

---

## 7. Migrations policy

- Drizzle migrations from day one of Phase A Storage (`s2-b`)
- Additive preferred
- Destructive changes require RFC note + backup guidance
- Seed: empty project path + default Feature/Policy set (see s2-a contract §7)

---

## 8. Decision Graph storage

Option A: `DecisionRecord.graphJson` — **V1 locked**
Option B: thin `DecisionGraphEdge` table when querying edges becomes hot — deferred

Repository hides storage choice from engines.

---

## 9. Outbox pattern

Domain events that must not be lost use `EventOutbox` with at-least-once delivery to buses / projections.

**Hardening (`s2-e`):** domain-fact write + outbox enqueue must share one SQLite transaction via `ClimeStorage.runAtomicWrite` (WAL + IMMEDIATE + per-handle async mutex). Normative contract: [`S2EA_STORAGE_HARDENING_CONTRACT.md`](../appendix/S2EA_STORAGE_HARDENING_CONTRACT.md). Outbox **publisher** drain remains Automation (`b3-c`).

---

## 10. Zod boundary (shared)

`@clime/shared` exports `SCHEMA_VERSION`, `withSchemaVersion`, Zod `schemaVersionSchema` / `parseWithSchemaVersion`, and normative enums (`publishMode`, `riskLevel`, publishing history kinds, Task SM states). Storage repos parse JSON columns at write/read boundaries per s2-a contract §5.

---

## 11. Anti-patterns

1. 100 tables on day one
2. Secrets columns with raw tokens
3. Engine-specific DB clients
4. Parallel knowledge tables per namespace
5. Assuming Supabase is required for V1
6. Reintroducing Prisma as the V1 ORM

---

## 12. Cross-references

- Lean entity intent → plan / `01_PRODUCT.md` slim-down
- Knowledge shape → `11_MEMORY_KNOWLEDGE.md`
- Storage infra → `12_INFRASTRUCTURE.md`
- Governance tables → `13_GOVERNANCE.md`
- Frozen column/port map → [`S2A_STORAGE_CONTRACT.md`](../appendix/S2A_STORAGE_CONTRACT.md)
- Storage hardening (WAL / mutex / atomic outbox) → [`S2EA_STORAGE_HARDENING_CONTRACT.md`](../appendix/S2EA_STORAGE_HARDENING_CONTRACT.md)

---

## 13. Acceptance

### Phase 0 (docs)

- [x] First-class table list
- [x] JSON-until-hot rule
- [x] Repository portability (Drizzle)
- [x] `posted_session` in PublishingHistory
- [x] Postgres deferred clearly
- [x] schema_version on documents

### Phase A Storage contract (`s2-a`)

- [x] Full 25-table map frozen (appendix contract)
- [x] Zod + `schema_version` boundary rules frozen
- [x] Repository ports + `ClimeStorage` facade frozen
- [x] ORM lock: Drizzle — not Prisma; Supabase client = 0 for V1
- [x] `s2-b`/`s2-c`: `packages/storage` implements this contract
- [x] `s2-d`: Prove checklist GREEN — [`S2D_STORAGE_PROVE.md`](../appendix/S2D_STORAGE_PROVE.md)
