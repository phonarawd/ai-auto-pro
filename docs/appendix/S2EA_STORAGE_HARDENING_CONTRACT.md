# S2-E-A Storage Hardening Contract (FROZEN)

**Status:** FROZEN — plan to-do `s2-e-a` (GROK4.5/256K); **implemented** `s2-e-b`; **PROVED GREEN** [`S2EC_STORAGE_HARDENING_PROVE.md`](S2EC_STORAGE_HARDENING_PROVE.md) (`s2-e-c`)  
**Normative for:** `s2-e-b` implementation (COMPOSER2.5) — implement **this file only**; no scope expansion  
**Prove:** `s2-e-c` (GROK4.5) — **GREEN** against §8; full fortification recheck later at `x-b`  
**Anchors:** `(x-a §1` storage half + `§4` outbox atomic`)` — [`XA_FORTIFICATION_CONTRACT.md`](XA_FORTIFICATION_CONTRACT.md)  
**SSOT parents:** [`XA_FORTIFICATION_CONTRACT.md`](XA_FORTIFICATION_CONTRACT.md), [`S2A_STORAGE_CONTRACT.md`](S2A_STORAGE_CONTRACT.md), [`14_DATABASE.md`](../architecture/14_DATABASE.md), [`12_INFRASTRUCTURE.md`](../architecture/12_INFRASTRUCTURE.md), [`02_CONSTITUTION.md`](../architecture/02_CONSTITUTION.md)

---

## 0. Locks (non-negotiable)

| Lock | Rule |
|---|---|
| Package home | Hardening lives **only** in `@clime/storage` — second WAL / mutex / outbox-txn layer elsewhere = **merge blocker** |
| Access | Engines / UI / Domain API host still use **Repository / `ClimeStorage` only** — never open SQLite, never import Drizzle |
| Scope of `s2-e-a` | **Document only** — no TypeScript, migrations, or CI in this to-do |
| Scope of `s2-e-b` | Implement WAL · IMMEDIATE · async mutex · `runAtomicWrite` outbox hook per this contract |
| Ownership split | Storage owns **enqueue atomicity**; Automation (`b3`) owns **outbox publisher worker** + SM optimistic lock + lease heartbeat — do not move either half |
| Tables | No new first-class tables — `event_outbox` columns remain [`S2A`](S2A_STORAGE_CONTRACT.md) §3.17 |
| Zod | Boundary JSON still requires `schema_version` (inherited; do not weaken) |
| ORM / cloud | Drizzle + SQLite only — **Prisma 0 · Supabase/Postgres client 0** |

**Forbidden (merge blockers):** Engine-local SQLite clients · duplicate mutex outside storage · “fire-and-forget” domain-fact write then separate outbox enqueue without `runAtomicWrite` · captcha/bypass (N/A here but keep path clean) · Postgres product path · changing Task SM / lease ownership into this slice.

---

## 1. Gap vs current `@clime/storage` (baseline for `s2-e-b`)

Observed (2026-08-07) — contract closes these gaps; do not treat as already done:

| Control | Current | Required after `s2-e-b` |
|---|---|---|
| WAL | `openSqliteDatabase` sets `foreign_keys` only | Product file DB opens with `journal_mode=WAL` (+ sync policy below) |
| IMMEDIATE | No explicit begin mode | Mutating multi-statement units use **BEGIN IMMEDIATE** |
| Repo mutex | None — async repo methods can interleave on one connection | One **async mutex / queue per DB handle** |
| Outbox atomic | `EventOutboxRepository.enqueue` is a standalone insert | Public **`runAtomicWrite`** hook: domain fact + outbox enqueue in **one** txn under the mutex |

Base Storage prove (`s2-d`) remains GREEN for tables/ports/Zod; this slice **hardens runtime integrity**, not the 25-table map.

---

## 2. Ownership map (x-a §1 / §4 — storage half only)

| Control | Normative owner | This contract |
|---|---|---|
| SQLite WAL + durable sync PRAGMAs | `s2-e-a`→`b` | §3 |
| BEGIN IMMEDIATE write transactions | `s2-e-a`→`b` | §4 |
| Repo async mutex | `s2-e-a`→`b` | §5 |
| Transactional outbox **enqueue** hook | `s2-e-a`→`b` | §6 |
| Outbox **publisher** drain / attempts / at-least-once bus publish | `b3-c` | **Out of scope** — keep `listPending` / `markPublished` / `markFailed` |
| Task SM optimistic lock (`version` / `updated_at`) | `b3-a`→`b` | **Out of scope** |
| Worker `lease_expires_at` + heartbeat | `b3-a`→`c` | **Out of scope** |
| Partial-failure node stop + Validate skip = 0 | `b3-b` / Content | **Out of scope** |

---

## 3. WAL + durable sync policy `(x-a §1)`

### 3.1 When applied

On every product **file** DB open path (`openSqliteDatabase` / `createSqliteStorage` for non-`:memory:` paths), after connection create and **before** migrate/seed/repo use:

```text
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;   -- milliseconds; V1 default
PRAGMA foreign_keys = ON;     -- already required by S2A; keep
```

| PRAGMA | Normative value | Rationale |
|---|---|---|
| `journal_mode` | `WAL` | Concurrent readers + single-writer discipline; crash-safe with mutex |
| `synchronous` | `NORMAL` | WAL-recommended durability for desktop V1 (not `OFF`; not required `FULL`) |
| `busy_timeout` | `5000` | Contended IMMEDIATE waits briefly instead of instant `SQLITE_BUSY` flake |
| `foreign_keys` | `ON` | Inherited S2A |

**Do not** set `synchronous=OFF` in product builds. Changing sync policy requires amending this contract (GROK session).

### 3.2 `:memory:` / test exception

| Path | Rule |
|---|---|
| `:memory:` | WAL assertion **not required** (driver/mode may stay non-WAL). Mutex + IMMEDIATE + `runAtomicWrite` **still required**. |
| Temp file DB (recommended for WAL tests) | Must report `journal_mode` = `wal` (case-insensitive) after open |

### 3.3 Acceptance (prove in `s2-e-c`)

- [ ] Temp-file product open → `PRAGMA journal_mode` returns `wal`
- [ ] `synchronous` is `NORMAL` (or documented equivalent query) on product open
- [ ] Engines still never import Drizzle/SQLite

---

## 4. BEGIN IMMEDIATE `(x-a §1)`

### 4.1 Normative behavior

- Any **write transaction** started by Storage (including `runAtomicWrite` and any internal multi-statement write helper) must use **BEGIN IMMEDIATE** (or better-sqlite3 / Drizzle equivalent that acquires a RESERVED lock at begin — e.g. `.immediate()`).
- **BEGIN DEFERRED** for mutating units = **forbidden** (fails late under contention).
- Single-statement writes that are not wrapped in an explicit multi-statement txn must still run **under the async mutex** (§5). Prefer routing multi-step domain+outbox work through `runAtomicWrite`.

### 4.2 Failure under contention

- If IMMEDIATE cannot acquire lock within `busy_timeout`, surface a typed/storage error (message may include SQLite busy); caller retries or fails with `traceId` at Domain API layer — Storage need not invent bus events.
- No silent partial commit of a multi-statement unit.

### 4.3 Acceptance

- [ ] `runAtomicWrite` path uses IMMEDIATE (test spy, pragma/sql trace, or better-sqlite3 transaction mode assertion)
- [ ] Concurrent writers do not leave half-applied multi-statement units

---

## 5. Repository async mutex `(x-a §1)`

### 5.1 Normative behavior

| Rule | Detail |
|---|---|
| Granularity | **One** async mutex / serial queue **per DB handle** (per `createSqliteStorage` instance) |
| Coverage | **All** Repository method bodies that touch SQLite (reads **and** writes) + `runAtomicWrite` + `seedDefaults` |
| Ordering | FIFO / fair enough that overlapping `await` boundaries cannot interleave statements from two repo calls on the same handle |
| Nesting | `runAtomicWrite` already holds the mutex; repo calls **inside** the callback must **not** deadlock (re-entrant join / “mutex held” alias — implementer’s choice, but must not hang) |
| Multi-instance | Two `createSqliteStorage` on the **same file** from one process is **unsupported** in V1 (document; do not build distributed locks) |

### 5.2 Explicit non-goals

- Multi-process SQLite writers / file locking product
- Distributed locks
- UI-thread locking
- Per-table lock striping

### 5.3 Acceptance

- [ ] Concurrent overlapping repo writes (e.g. parallel `Promise.all` mutations) do not corrupt rows / throw uncaught interleaving errors
- [ ] Mutex is internal to `@clime/storage` — not reimplemented in engines

---

## 6. Outbox atomic write hook `(x-a §4)`

### 6.1 Problem statement

Crash or await gap between “domain fact committed” and “`event_outbox` row inserted” must be **impossible** for paired writes. At-least-once delivery is enough; exactly-once bus delivery is **out of scope**.

### 6.2 Public API (frozen name)

Extend the `ClimeStorage` / `SqliteStorage` facade (ports + SQLite impl) with:

```ts
/**
 * Acquire per-handle async mutex → BEGIN IMMEDIATE → run `work` → COMMIT.
 * On throw: ROLLBACK; rethrow. Nested runAtomicWrite joins the same txn+mutex
 * (or throws ClimeStorageTransactionError — pick one in s2-e-b and test it).
 *
 * Domain-fact + EventOutbox pairs MUST call eventOutbox.enqueue inside `work`.
 */
runAtomicWrite<T>(work: (uow: ClimeStorageUnitOfWork) => Promise<T> | T): Promise<T>;
```

`ClimeStorageUnitOfWork` = the same Repository ports as `ClimeStorage` **excluding** `close` / `seedDefaults` / nested public lifecycle, **or** the same `ClimeStorage` repo fields (`projects`, `eventOutbox`, …) bound to the open transaction.  
**Normative:** `uow.eventOutbox.enqueue` and other `uow.*` writes participate in **the same** SQLite transaction as `work`.

### 6.3 Caller law (engines / Domain API / Automation)

| Case | Required |
|---|---|
| Persist domain fact **and** emit durable outbox event | **`runAtomicWrite`** — fact write(s) + `eventOutbox.enqueue` inside `work` |
| Outbox-only enqueue (no paired fact) | `eventOutbox.enqueue` OK (still under mutex); prefer `runAtomicWrite` if any other write is involved |
| Publisher drain (`listPending` / `markPublished` / `markFailed`) | Unchanged ports; worker impl = **`b3-c`** |

**Forbidden pattern (merge blocker when introduced by callers after this lands):**

```text
await storage.missions.create(...);           // commits
await storage.eventOutbox.enqueue(...);       // separate — CRASH WINDOW
```

Hardening cannot lint all future engines in `s2-e-b`; prove tests **must** demonstrate the hook closes the window, and this contract forbids the split pattern for paired writes.

### 6.4 Payload / Zod (unchanged)

- `payload_json` still Zod-validated with `schema_version` ([`S2A`](S2A_STORAGE_CONTRACT.md) §5 / §3.17).
- `trace_id` column remains mandatory on enqueue input (existing port).
- No new outbox columns in this slice.

### 6.5 Acceptance

- [ ] Test: simulated failure after domain insert but before outbox insert **inside** `runAtomicWrite` → **neither** row visible after rollback
- [ ] Test: successful `runAtomicWrite` → domain row + `event_outbox` status `pending` both visible
- [ ] Standalone `enqueue` still works for outbox-only cases
- [ ] Publisher worker **not** implemented here

---

## 7. Package layout (`s2-e-b` may add — keep lean)

Suggested additive files under `packages/storage/` (names indicative; behavior is normative):

```text
packages/storage/src/
  db/
    client.ts              # WAL + synchronous + busy_timeout on file open
  runtime/                 # NEW (or equivalent internal folder)
    async-mutex.ts         # per-handle serial queue
    write-gate.ts          # mutex + IMMEDIATE helpers
  repos/
    create-sqlite-storage.ts  # wire mutex + runAtomicWrite
    helpers.ts                # RepoContext may carry write-gate
  ports/
    repositories.ts        # ClimeStorage.runAtomicWrite + UnitOfWork type
```

**Allowed deps:** unchanged (drizzle-orm, better-sqlite3, zod, `@clime/shared`).  
**Forbidden:** new ORM, Prisma, Supabase clients, engine imports of `db/client`.

Public export surface: `createSqliteStorage` / `createAndSeedSqliteStorage` remain the only bootstrap; `runAtomicWrite` available on returned facade. Do **not** export raw mutex or sqlite handles.

---

## 8. Prove checklist (for `s2-e-c`)

- [x] File DB opens with WAL; test asserts `journal_mode=wal`
- [x] `synchronous=NORMAL` + `busy_timeout=5000` applied on product open
- [x] Repo async mutex serializes concurrent mutations (stress/smoke test)
- [x] Write txn path uses BEGIN IMMEDIATE (or equivalent)
- [x] `runAtomicWrite` rolls back domain+outbox together on mid-callback failure
- [x] Successful atomic path leaves fact + pending outbox
- [x] No second WAL/mutex outside `@clime/storage`
- [x] No outbox publisher worker / SM optimistic lock / lease heartbeat in this slice
- [x] Prisma / Supabase product paths still **0**
- [x] `pnpm lint` / `typecheck` / `test` GREEN

Full stamp → [`S2EC_STORAGE_HARDENING_PROVE.md`](S2EC_STORAGE_HARDENING_PROVE.md) (**GREEN**).

---

## 9. Explicit non-goals (out of `s2-e`)

| Non-goal | Owner |
|---|---|
| Outbox publisher / bus drain | `b3-c` |
| WorkflowRun optimistic concurrency | `b3-a`→`b` |
| Planner lease heartbeat / zombie reclaim | `b3-a`→`c` |
| New tables / column redesign | — |
| Postgres / multi-writer | L+ |
| Vault / secrets | `s4-*` |
| Circuit breaker | `s4.5-*` |
| Domain API / UI changes | — |

---

## 10. Cross-links to amend lightly (docs only in `s2-e-a`)

| Doc | Update |
|---|---|
| [`14_DATABASE.md`](../architecture/14_DATABASE.md) §9 Outbox | Point to atomic enqueue via `runAtomicWrite`; publisher remains Automation |
| [`03_NEXT_ACTIONS.md`](../setup/03_NEXT_ACTIONS.md) | Mark `s2-e-a` frozen; next `s2-e-b` |
| [`XA_FORTIFICATION_CONTRACT.md`](XA_FORTIFICATION_CONTRACT.md) handoff | Point implement next → `s2-e-b` |

RFC narrative stays thin; **this appendix is normative** for COMPOSER.

---

## 11. Handoff

| Field | Value |
|---|---|
| Contract id | `s2-e-a` |
| Artifact | [`S2EA_STORAGE_HARDENING_CONTRACT.md`](S2EA_STORAGE_HARDENING_CONTRACT.md) |
| Implement | `s2-e-b` **DONE** |
| Prove | `s2-e-c` **GREEN** — [`S2EC_STORAGE_HARDENING_PROVE.md`](S2EC_STORAGE_HARDENING_PROVE.md) |
| After `s2-e-c` | Plan order: `s4-a` (Vault/Session/Config) |
| Recommended model (next) | **GROK4.5** for `s4-a` |
| Do not | Duplicate WAL/mutex in engines · Implement outbox publisher / SM lock / leases here · Skip to `x-b` before owners DONE |
