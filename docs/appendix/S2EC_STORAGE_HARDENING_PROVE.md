# S2-E-C Storage Hardening Prove (GREEN)

**Status:** GREEN — plan to-do `s2-e-c` (GROK4.5/256K)  
**Date:** 2026-08-07  
**Contract:** [`S2EA_STORAGE_HARDENING_CONTRACT.md`](S2EA_STORAGE_HARDENING_CONTRACT.md) §8  
**Parent fortification:** [`XA_FORTIFICATION_CONTRACT.md`](XA_FORTIFICATION_CONTRACT.md) §1 storage half + §4 outbox atomic  
**RFC:** [`14_DATABASE.md`](../architecture/14_DATABASE.md), [`12_INFRASTRUCTURE.md`](../architecture/12_INFRASTRUCTURE.md)

---

## Prove checklist

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | File DB opens with WAL; `journal_mode=wal` | PASS | `hardening.test.ts` — temp-file open → pragma `wal` |
| 2 | `synchronous=NORMAL` + `busy_timeout=5000` on product open | PASS | `client.ts` PRAGMAs; test asserts sync=`1`/`NORMAL`, busy=`5000` |
| 3 | Repo async mutex serializes concurrent mutations | PASS | `Promise.all` 40× `projects.create` — unique ids, list length 40 |
| 4 | Write txn path uses BEGIN IMMEDIATE | PASS | `WriteGate` spy: `BEGIN IMMEDIATE` (no DEFERRED) + `COMMIT` |
| 5 | `runAtomicWrite` rolls back domain+outbox on mid-callback failure | PASS | throw after mission create → mission null, pending outbox 0; Zod-fail outbox path same |
| 6 | Successful atomic path leaves fact + pending outbox | PASS | mission row + `event_outbox.status=pending` after `runAtomicWrite` |
| 7 | No second WAL/mutex outside `@clime/storage` | PASS | `boundary.engine-import.test.ts` scans packages/apps for `journal_mode=WAL` / `BEGIN IMMEDIATE` / `WriteGate` / `AsyncMutex` |
| 8 | No outbox publisher / SM optimistic lock / lease heartbeat in this slice | PASS | Outbox ports still enqueue/listPending/mark* only; no publisher worker; no `version`/`lease_expires` logic added (`b3` owns those) |
| 9 | Prisma / Supabase product paths still **0** | PASS | workspace package.json scan + engine import boundary (unchanged s2-d locks) |
| 10 | `pnpm lint` / `typecheck` / `test` GREEN | PASS | 2026-08-07: turbo lint/typecheck/test all successful — `@clime/storage` **23** tests; workspace suites GREEN |

---

## Implementation map (s2-e-b)

| Control | Location |
|---|---|
| WAL + sync + busy_timeout | `packages/storage/src/db/client.ts` |
| Async mutex | `packages/storage/src/runtime/async-mutex.ts` |
| IMMEDIATE write gate + repo wrap | `packages/storage/src/runtime/write-gate.ts` |
| `runAtomicWrite` + wired repos | `packages/storage/src/repos/create-sqlite-storage.ts` |
| Ports | `ClimeStorage.runAtomicWrite` / `ClimeStorageUnitOfWork` in `ports/repositories.ts` |

---

## Locks reaffirmed

- Hardening lives **only** in `@clime/storage` — no engine-local SQLite / second mutex
- Engines/UI → Repository / `ClimeStorage` only; public surface does not export `WriteGate` / `openSqliteDatabase`
- Domain-fact + outbox pairs → `runAtomicWrite` (crash window closed)
- Outbox **publisher** drain remains Automation (`b3-c`)
- Prisma client count = **0** · Supabase/Postgres product client count = **0**
- Nested `runAtomicWrite` joins same txn+mutex (no deadlock)

---

## Handoff

| Field | Value |
|---|---|
| Prove id | `s2-e-c` |
| Slice 2-E | **DONE** (`s2-e-a` → `s2-e-b` → `s2-e-c`) |
| Next to-do | `s4-a` (Vault/Session/Config contract) — GROK4.5 |
| Fortification remaining | `b3` (SM lock + lease + outbox publisher) · `c2`/`b1`/`f` (jitter/quota) · `s4`/`s4.5` · full recheck at `x-b` |
| Recommended model | **GROK4.5** for `s4-a` |
| Do not | Duplicate WAL/mutex in engines · Implement publisher/leases here · Skip to `x-b` before owners DONE · Reintroduce Prisma/Supabase |
