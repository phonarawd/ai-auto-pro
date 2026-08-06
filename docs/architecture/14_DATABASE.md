# 14 — Database: Lean V1 Entities + JSON · Postgres Port

**Status:** Phase 0 RFC  
**V1 store:** SQLite via Prisma + Repository pattern  
**Later:** Postgres / Supabase without engine rewrites

---

## 1. Design law

- Prefer **fewer first-class tables**  
- Most other shapes = **JSON columns** / manifests until proven hot  
- Full ~100-entity ER is L+/appendix — **not** V1 migration day-1  
- Engines never import Prisma directly (`12_INFRASTRUCTURE.md`)  

---

## 2. First-class tables (SQLite V1)

### Identity & settings

| Table | Notes |
|---|---|
| `Project` | Root workspace unit |
| `UserSettings` | User prefs |
| `GlobalSettings` / `ProjectSettings` | Cascade values |

### Account

| Table | Notes |
|---|---|
| `PlatformAccount` | Connected accounts |
| `AccountCredentialRef` | Vault refs only |
| `SessionRecord` | Lifecycle metadata |
| `PlatformCapability` | Matrix flags snapshot |
| `ConnectorRegistration` | Lean + `manifestJson` |

### Growth / work

| Table | Notes |
|---|---|
| `Mission` | Mission Center |
| `DecisionRecord` | + `graphJson` or thin `DecisionGraphEdge` |
| `PlannerQueueItem` | Queue buffer |

### Content / workflow

| Table | Notes |
|---|---|
| `WorkflowRun` | DSL run + cursor |
| `ContentItem` | Artifacts metadata |
| `PublishingHistoryEvent` | draft/export/posted_* |

### Knowledge / events / analytics

| Table | Notes |
|---|---|
| `KnowledgeItem` | `namespace`, `type`, `tags`, `body`/`blobRef`, Evolution scores |
| `EventOutbox` / domain events | Reliable publish |
| `AnalyticsSnapshot` | Or rolled metrics JSON |

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

## 4. Repository interfaces (illustrative)

```text
ProjectRepository
AccountRepository
MissionRepository
DecisionRepository
PlannerQueueRepository
WorkflowRunRepository
ContentRepository
KnowledgeRepository
AnalyticsRepository
FeatureRepository
PolicyRepository
LearningRepository
…
```

Implementations: `Sqlite*Repository` now → `Postgres*Repository` later.

---

## 5. Postgres / Supabase port

| Concern | Approach |
|---|---|
| When | Trend/Graph/Analytics/Memory volume grows |
| How | New Storage driver + migrations; engines untouched |
| Auth | Still local Owner V1; cloud auth is separate product decision |
| Realtime | Optional later; not V1 requirement |

---

## 6. Files alongside DB

| Path | Content |
|---|---|
| `Exports/YYYY-MM-DD/` | Export packs |
| Blob store | Images, thumbnails, large reports |
| Vault | Encrypted secrets (not SQLite plaintext) |
| Logs | Observability files / sinks |

---

## 7. Migrations policy

- Prisma migrate (or equivalent) from day one of Phase A  
- Additive preferred  
- Destructive changes require RFC note + backup guidance  
- Seed: empty project + default Feature/Policy set  

---

## 8. Decision Graph storage

Option A: `DecisionRecord.graphJson`  
Option B: thin `DecisionGraphEdge` table when querying edges becomes hot  

V1 may start with A; repository hides choice.

---

## 9. Outbox pattern

Domain events that must not be lost use `EventOutbox` (or equivalent) with at-least-once delivery to buses / projections.

---

## 10. Appendix note

Optional `docs/appendix/` may hold full module catalogs / 100-entity ER — **not** required for Cursor implementation passes.

---

## 11. Anti-patterns

1. 100 tables on day one  
2. Secrets columns with raw tokens  
3. Engine-specific DB clients  
4. Parallel knowledge tables per namespace  
5. Assuming Supabase is required for V1  

---

## 12. Cross-references

- Lean entity intent → plan / `01_PRODUCT.md` slim-down  
- Knowledge shape → `11_MEMORY_KNOWLEDGE.md`  
- Storage infra → `12_INFRASTRUCTURE.md`  
- Governance tables → `13_GOVERNANCE.md`  

---

## 13. Acceptance (Phase 0)

- [x] First-class table list
- [x] JSON-until-hot rule
- [x] Repository portability
- [x] Postgres deferred clearly
- [x] schema_version on documents
