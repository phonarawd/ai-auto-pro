# S3-E Domain API / Buses Prove (GREEN)

**Status:** GREEN — plan to-do `s3-e` (GROK4.5/256K)  
**Date:** 2026-08-07  
**Contract:** [`S3A_DOMAIN_API_CONTRACT.md`](S3A_DOMAIN_API_CONTRACT.md) §12  
**RFC:** [`04_DOMAIN_API.md`](../architecture/04_DOMAIN_API.md), [`12_INFRASTRUCTURE.md`](../architecture/12_INFRASTRUCTURE.md)

---

## Prove checklist

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | `@clime/domain-api` exists; dependency law satisfied | PASS | `package.json` deps = `@clime/shared`, `@clime/feature-management`, `@clime/observability`, `zod` only; **no** `@clime/event-bus` / drizzle / prisma / supabase (`prove.s3e.test.ts`) |
| 2 | All §5 channels defined in registry (handler may stub) | PASS | 14 namespaces · **85** channels (C2 added `account.publish`) · `domain:<ns>.<method>` only (`registry.test.ts`, `prove.s3e.test.ts`) |
| 3 | IPC envelope requires `requestId`, `schema_version`, `traceId` | PASS | Zod `domainIpcRequestSchema`; validation failure path covered |
| 4 | `[A]` methods return `AsyncJobAck` without blocking | PASS | All 7 `[A]` methods return `job_*` + `traceId` + `schema_version` immediately |
| 5 | Preload exposes DomainClient only | PASS | `setupDesktopPreload` / `exposeDomainClientInPreload`; desktop test — no `ipcRenderer` / bus subscribe on bridge |
| 6 | `governance.*` wraps S25A GovernanceAPI mutations | PASS | `createGovernanceDomainHandlers` replaces stubs when full `GovernanceAPI` injected; admit still gates C/A |
| 7 | `automation.startMission` enforces Queue path (no bypass API) | PASS | Ack includes `plannerQueueItemId`; no bypass/skipQueue method in frozen map |
| 8 | Renderer bus subscribe 0 — progress via NotificationAPI | PASS | `@clime/desktop` has no `@clime/event-bus` dep; preload forbids bus APIs; push channel = `domain:notification.push` only |
| 9 | Channel notation single (`domain:` only — not `domain.`) | PASS | `parseDomainChannel` rejects `domain.*`; host returns `NOT_FOUND` for dot-prefix |
| 10 | `pnpm lint` / `typecheck` / `test` GREEN | PASS | 2026-08-07: turbo lint/typecheck/test successful (domain-api + event-bus + observability + desktop) |

---

## Locks reaffirmed

- IPC channel = **`domain:<namespace>.<method>` only**
- Long work → immediate **`jobId`**; UI must not await completion on IPC
- Buses (Command / Query / Domain / System) = **internal only** — not renderer-subscribed
- Progress / challenge → **NotificationAPI** (`domain:notification.push` allowlist)
- UI → IPC → Domain API host → engines/repos
- Prisma / Supabase client count = **0**

---

## Handoff

| Field | Value |
|---|---|
| Prove id | `s3-e` |
| Slice 3 | **DONE** (s3-a → s3-b → s3-c → s3-d → s3-e) |
| Next to-do | `x-a` (Fortification Master Contract — code 0) |
| Recommended model | GROK4.5 |
| Do not | `domain.` channel notation · UI bus subscribe · blocking long IPC · Queue bypass START · Governance mutations outside `governance.*` · Reintroduce Prisma/Supabase |
