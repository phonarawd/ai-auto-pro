# B3-A Workflow + Automation Contract (FROZEN)

**Status:** FROZEN — plan to-do `b3-a` (GROK4.5/256K); **Prove** in `b3-d`  
**Normative for:** `b3-b` (`@clime/workflow`) / `b3-c` (`@clime/automation`) — implement **this file only**; no scope expansion  
**Anchors:** `(x-a §1` SM/lease + `§4` publisher/partial`)` — [`XA_FORTIFICATION_CONTRACT.md`](XA_FORTIFICATION_CONTRACT.md)  
**SSOT parents:** [`05_WORKFLOW.md`](../architecture/05_WORKFLOW.md), [`02_CONSTITUTION.md`](../architecture/02_CONSTITUTION.md), [`12_INFRASTRUCTURE.md`](../architecture/12_INFRASTRUCTURE.md), [`14_DATABASE.md`](../architecture/14_DATABASE.md), [`S2A_STORAGE_CONTRACT.md`](S2A_STORAGE_CONTRACT.md), [`S2EA_STORAGE_HARDENING_CONTRACT.md`](S2EA_STORAGE_HARDENING_CONTRACT.md), [`S3A_DOMAIN_API_CONTRACT.md`](S3A_DOMAIN_API_CONTRACT.md), [`S25A_GOVERNANCE_CONTRACT.md`](S25A_GOVERNANCE_CONTRACT.md)

---

## 0. Locks & Invariants (non-negotiable)

| Lock | Rule |
|---|---|
| **Everything is a Workflow** | Mission work executes as a Workflow DSL run — not ad-hoc engine calls from UI |
| **Task State Machine** | Happy path only: `QUEUED → RUNNING → VALIDATING → OPTIMIZING → READY → PUBLISHED`. Terminals: `FAILED` / `CANCELLED` / `BLOCKED_HUMAN` / `BLOCKED_CAPABILITY` / `BLOCKED_POLICY` / `PAUSED_CHALLENGE` |
| **Validate skip = 0** | Illegal to transition into `OPTIMIZING` / `READY` / `PUBLISHED` without having passed through `VALIDATING` on this run |
| **START → Queue only** | `automation.startMission` **must** enqueue `PlannerQueueItem` then return `{ jobId }` — Workers consume the queue. Direct Worker invoke / SM advance from START = **merge blocker** |
| **Optimistic SM lock** | Every `WorkflowRun` state change checks `version` **and** `updated_at`; conflict → no silent overwrite; surface `traceId` |
| **Lease + heartbeat** | Queue lease sets `lease_expires_at`; worker heartbeats extend it; expired lease → reclaim (zombie → `ready`) |
| **Outbox split** | Storage owns **atomic enqueue** (`runAtomicWrite`); Automation owns **publisher worker** drain (at-least-once) |
| **Partial failure** | Node failure → honest terminal / pause with `traceId` — never fake `PUBLISHED` |
| **Governor** | Worker concurrency **max 2–3** (V1 default **3**); overload → throttle / stay queued — not UI freeze |
| **Repository only** | Engines never import Drizzle/SQLite; persist via `@clime/storage` ports |
| **Schema versioning** | DSL, queue payload, cursor, outbox payload: Zod + required `schema_version` |
| **No captcha bypass** | Challenge → `PAUSED_CHALLENGE` + Inbox path only |

**Forbidden (merge blockers):** Queue bypass on START · Validate skip transitions · Prisma / Supabase product clients · Playwright in workflow/automation · captcha solve CTA · Export as sole success path when Matrix allows publish · second WAL/mutex outside storage · inventing new first-class tables (additive columns on existing tables only — §2)

---

## 1. Package ownership

| Package | Owns | Does **not** own |
|---|---|---|
| **`@clime/workflow`** (`packages/workflow`) | DSL Zod + templates; Task SM graph; optimistic transition service; partial-failure stop + `traceId`; WorkflowAPI handlers | Planner Queue, Workers, Outbox publisher, Governor pool |
| **`@clime/automation`** (`packages/automation`) | Planner Queue enqueue/lease/heartbeat/reclaim; Worker Runtime; Resource Governor (concurrency); Outbox publisher worker; `startMission` = Queue path; AutomationAPI handlers | DSL schema ownership; Content Validate/Publish engines (C1/C2 stubs OK) |
| **`@clime/storage`** (additive only) | Columns + port methods for `version` / `lease_expires_at` / optimistic transition / heartbeat / reclaim | Business SM legality (workflow), publisher loop (automation) |
| **`@clime/feature-management`** | Lean `admit()` / Kill Switch cancel (already DONE) | Worker pool / Resource Scheduler |

```text
UI → domain:automation.startMission
  → Automation enqueues PlannerQueueItem (status=ready) + jobId ack
  → Worker leases item (lease_expires_at) under Governor
  → Workflow creates/advances WorkflowRun via optimistic SM
  → Nodes: … → validate → … → publish (+ export backup)
  → Outbox publisher drains pending EventOutbox (at-least-once)
```

---

## 2. Additive storage (no new tables)

S2A first-class table count stays **25**. B3 adds columns + port methods only.

### 2.1 `workflow_run` (+ optimistic lock)

| Column | Type | Notes |
|---|---|---|
| `version` | integer NOT NULL DEFAULT 1 | Monotonic; increment on every successful SM transition |

### 2.2 `planner_queue_item` (+ lease expiry)

| Column | Type | Notes |
|---|---|---|
| `lease_expires_at` | text null | ISO-8601; set on lease / heartbeat; null when not leased |

### 2.3 Port extensions (normative)

**`WorkflowRunRepository`**

| Method | Behavior |
|---|---|
| `create(…)` | Inserts with `version = 1` (unless explicit) |
| `transition(id, state, cursorJson?)` | Loads current row; performs optimistic update; returns `{ ok, version?, updatedAt?, reason? }` |
| `transitionWithLock(id, { expectedVersion, expectedUpdatedAt, state, cursorJson? })` | `UPDATE … WHERE id AND version AND updated_at`; success → `version+1`, new `updated_at`; conflict → `{ ok:false, reason:"conflict" }` |

**`PlannerQueueRepository`**

| Method | Behavior |
|---|---|
| `lease(id, workerId, at, leaseExpiresAt)` | Atomic ready→leased; sets `leased_by`, `leased_at`, `lease_expires_at` |
| `heartbeat(id, workerId, leaseExpiresAt)` | Extends `lease_expires_at` only if still leased by `workerId` |
| `reclaimExpired(now)` | `leased` rows with `lease_expires_at < now` → `ready`, clear lease fields; returns reclaimed ids |

Migration tag: `0001_b3_sm_lease` (additive SQL).

---

## 3. Task SM (Workflow)

### 3.1 Legal happy-path edges

```text
QUEUED → RUNNING
RUNNING → VALIDATING
VALIDATING → OPTIMIZING
OPTIMIZING → READY
READY → PUBLISHED
```

### 3.2 Legal block / terminal edges (from any non-terminal)

`→ FAILED` · `→ CANCELLED` · `→ BLOCKED_HUMAN` · `→ BLOCKED_CAPABILITY` · `→ BLOCKED_POLICY` · `→ PAUSED_CHALLENGE`

### 3.3 Illegal (must reject; Validate skip = 0)

- `RUNNING → OPTIMIZING` / `RUNNING → READY` / `RUNNING → PUBLISHED`
- `QUEUED → VALIDATING` / `QUEUED → PUBLISHED`
- `VALIDATING → READY` / `VALIDATING → PUBLISHED` (must pass `OPTIMIZING`)
- Any transition **from** a terminal state
- Any edge not listed in §3.1–§3.2

### 3.4 Optimistic lock semantics

1. Caller supplies `expectedVersion` + `expectedUpdatedAt` from last read (or uses `transition` helper that re-reads).
2. Winner: row updates `state`, optional `cursor_json`, `version = version + 1`, fresh `updated_at`.
3. Loser: `{ ok:false, reason:"conflict" }` — **no** silent overwrite; caller retries or fails with `traceId`.

### 3.5 Partial failure

On node error:

1. Stop advancing the graph (no further Optimize/Publish).
2. Transition to `FAILED` or `PAUSED_CHALLENGE` (challenge only) via optimistic lock.
3. Persist cursor envelope `{ schema_version, nodeId, error, traceId, stoppedAt }`.
4. Never emit success `posted_*` / never leave state as `PUBLISHED`.

---

## 4. Workflow DSL

### 4.1 Envelope (Zod)

```text
{
  schema_version: 1,
  id: string,
  name: string,
  nodes: [{ id: string, type: string }],
  edges: [[fromId, toId], ...]
}
```

### 4.2 Daily Growth template locks

V1 built-in template `daily-growth` **must** include:

| Requirement | Node type contains / equals |
|---|---|
| **validate** (mandatory) | `content.validate` |
| **publish** (mandatory) | `account.publish` |
| **export** (backup, parallel) | `content.export` |
| **measure** (mandatory) | `analytics.ingest_snapshot` |
| **learn** (mandatory, after measure) | `learning.propose_from_roi` |

Reject template registration / run create if Daily Growth shape lacks `publish`, `validate`, `measure`, or `learn`.

Export alone is **not** a publish success path when Matrix `canPublish`.

### 4.3 Node execution (B3 scope)

B3 may use **stub node runners** (record cursor + legal SM transitions). Real Content/Publish engines land in C1/C2 — but SM + Validate gate must already refuse skip.

---

## 5. Planner Queue + Workers (Automation)

### 5.1 Queue item status (not Task SM)

`ready` → `leased` → `completed` | `cancelled` | `failed`  
(plus reclaim: `leased` → `ready` on expiry)

### 5.2 `automation.startMission` ([A] async)

1. Resolve `projectId` / optional `missionId` / `templateId` (default `daily-growth`).
2. **Enqueue** `PlannerQueueItem` (`status=ready`, payload includes `schema_version`, `jobId`, template ref, missionId).
3. Optionally create `WorkflowRun` in `QUEUED` linked via `queue_item_id` (allowed) — but **must not** lease or run workers inline in the IPC handler beyond enqueue + ack.
4. Return `{ schema_version, jobId, traceId, plannerQueueItemId }` immediately.
5. Emit Domain `PlannerItemEnqueued` (Inbox progress path — existing B2 forwarder).

**Forbidden:** IPC handler calling Worker.execute / advancing SM to `RUNNING`/`PUBLISHED` without queue lease.

### 5.3 Lease + heartbeat

| Param | V1 default |
|---|---|
| Lease TTL | **30s** from lease/heartbeat |
| Heartbeat interval | ≤ **10s** while working |
| Concurrency | **max 3** active leases / workers (Governor) |

Expired without heartbeat → `reclaimExpired` restores `ready` for another worker.

### 5.4 Governor (Resource Scheduler lean)

- Before lease/start work: check active leased count `< maxConcurrent` (default 3; policy may lower via existing `governor_limits`).
- Over capacity → do not lease; item stays `ready`; may emit System `GovernorThrottled`.
- Heavy AI/publish work never on renderer thread (desktop main / node only).

### 5.5 Outbox publisher worker

Loop (interval or tick):

1. `eventOutbox.listPending(limit)`
2. Deliver via injectable sink (Domain/System bus publish) — at-least-once
3. `markPublished` on success; `markFailed` + increment attempts on failure
4. Survives restart (pending rows remain until published)

Does **not** re-implement `runAtomicWrite` — enqueue stays Storage.

---

## 6. Domain API (frozen channels)

IPC: `domain:workflow.<method>` / `domain:automation.<method>` + envelope `{ requestId, schema_version, traceId }`.

### 6.1 WorkflowAPI

| Method | Kind | Notes |
|---|---|---|
| `listTemplates` | Q | Includes `daily-growth` with publish+validate |
| `getTemplate` | Q | |
| `createRun` | C | Validates DSL; state `QUEUED`; **does not** bypass queue for Mission START |
| `getRun` / `listRuns` | Q | |
| `resumeRun` | C | From pause/block when legal |
| `cancelRun` | C | → `CANCELLED` via optimistic lock |

### 6.2 AutomationAPI

| Method | Kind | Notes |
|---|---|---|
| `startMission` | A | **Queue enqueue only** + `jobId` |
| `getQueueDepth` | Q | ready (+ optional leased) count |
| `getWorkerStatus` | Q | activeWorkers / maxConcurrent |
| `listQueue` | Q | |
| `cancelJob` | C | queue item → cancelled; linked run → `CANCELLED` |

---

## 7. Domain / System events

| Bus | Type | When |
|---|---|---|
| Domain | `PlannerItemEnqueued` | START / enqueue (existing) |
| Domain | `WorkflowRunTransitioned` | Successful SM transition (`from`, `to`, `workflowRunId`, `traceId`, `version`) |
| Domain | `WorkflowPartialFailure` | Node stop with `traceId` |
| System | `GovernorThrottled` | Worker admit denied (existing name) |
| System | `KillSwitchActivated` | Existing — cancels leased work |

---

## 8. Import DAG (frozen)

```text
@clime/workflow     → @clime/shared, zod, (@clime/storage types/ports only)
                      NO drizzle/sqlite · NO automation internals · NO playwright · NO UI

@clime/automation   → @clime/shared, zod, @clime/workflow (SM/DSL services),
                      @clime/storage ports, (@clime/event-bus optional for publisher/sink)
                      NO drizzle/sqlite · NO playwright · NO renderer

apps/desktop main   → wires Automation + Workflow domain handlers;
                      START → automation.startMission only
Renderer            → DomainClient only
```

---

## 9. Prove checklist (`b3-d`)

- [ ] `@clime/workflow` + `@clime/automation` packages exist; Prisma/Supabase/Playwright deps = 0
- [ ] DSL requires publish + validate on Daily Growth; Validate-skip transitions rejected
- [ ] Optimistic lock: conflicting transitions → one winner; loser `conflict` + `traceId` path
- [ ] Lease expiry reclaim works; heartbeat extends `lease_expires_at`
- [ ] `startMission` always creates/uses Planner Queue item; queue bypass count = 0
- [ ] Governor concurrency ≤ 3
- [ ] Outbox publisher drains pending → published/failed
- [ ] Partial failure never yields `PUBLISHED`
- [ ] `pnpm lint` / `typecheck` / `test` GREEN

---

## 10. Explicit non-goals (out of B3)

- Real Content Generate/Validate/Publish engines (C1/C2) — stubs + SM gates only
- BAE / session publish / jitter / daily quota (C2 / B1)
- `.clime` viral playbook export (vg-d)
- Distributed multi-process SQLite writers
- Exactly-once bus delivery
- Team Mode / Workspace settings

---

## 11. Handoff

| Part | Model | Deliverable |
|---|---|---|
| `b3-a` | GROK4.5 | **This contract FROZEN** |
| `b3-b` | COMPOSER2.5 | `packages/workflow` per §§3–4,6.1 |
| `b3-c` | COMPOSER2.5 | Storage additive §2 + `packages/automation` per §§5–6.2 |
| `b3-d` | GROK4.5 | Prove doc + GREEN gates |

**Do not** implement Worker/Outbox in `b3-b`. **Do not** redefine Task SM in `b3-c`.
