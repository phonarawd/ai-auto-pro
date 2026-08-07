# B3-D Workflow / Queue Prove (GREEN)

**Status:** GREEN — plan to-do `b3-d` (GROK4.5/256K)  
**Date:** 2026-08-07  
**SSOT parents:** [`B3A_WORKFLOW_AUTOMATION_CONTRACT.md`](B3A_WORKFLOW_AUTOMATION_CONTRACT.md), [`XA_FORTIFICATION_CONTRACT.md`](XA_FORTIFICATION_CONTRACT.md) §1 SM/lease + §4 publisher/partial, [`05_WORKFLOW.md`](../architecture/05_WORKFLOW.md)  
**Packages:** `@clime/workflow` · `@clime/automation` · storage additive `0001_b3_sm_lease` · desktop main wiring

---

## 1. Acceptance checklist

| # | Gate Item | Status | Verification |
|---|---|---|---|
| 1 | `@clime/workflow` + `@clime/automation` exist; Prisma/Supabase/Playwright deps = 0 | **PASS** | `boundary.test.ts` in both packages |
| 2 | DSL requires publish + validate on Daily Growth; Validate-skip transitions rejected | **PASS** | `workflow.test.ts` — VALIDATE_SKIP on `RUNNING→OPTIMIZING` |
| 3 | Optimistic lock: conflicting transitions → one winner; loser `conflict` + `traceId` | **PASS** | `workflow.test.ts` optimistic lock case |
| 4 | Lease expiry reclaim; heartbeat extends `lease_expires_at` | **PASS** | `automation.test.ts` reclaim + heartbeat |
| 5 | `startMission` always creates Planner Queue item; queue bypass = 0 | **PASS** | `automation.test.ts` + `prove.b3d.test.ts` — item `status=ready`, no lease on START |
| 6 | Governor concurrency ≤ 3 | **PASS** | default `DEFAULT_MAX_CONCURRENT_WORKERS=3`; desktop prove ≤3 |
| 7 | Outbox publisher drains pending → published | **PASS** | `automation.test.ts` outbox tick |
| 8 | Partial failure never yields `PUBLISHED` | **PASS** | `workflow.test.ts` stopOnPartialFailure → `FAILED` + `traceId` |
| 9 | `pnpm lint` / `typecheck` / `test` GREEN | **PASS** | monorepo after B3 |

---

## 2. Test verification

| Package | Tests |
|---|---|
| `@clime/storage` | migration `0001_b3_sm_lease` · `transitionWithLock` · `lease`/`heartbeat`/`reclaimExpired` |
| `@clime/workflow` | `workflow.test.ts` + `boundary.test.ts` |
| `@clime/automation` | `automation.test.ts` + `boundary.test.ts` |
| `@clime/desktop` | `prove.b3d.test.ts` (START→Queue wiring) |

---

## 3. Changed paths (B3 handoff)

- `docs/appendix/B3A_WORKFLOW_AUTOMATION_CONTRACT.md` — FROZEN contract (`b3-a`)
- `docs/appendix/B3D_QUEUE_PROVE.md` — this prove
- `packages/storage` — `workflow_run.version`, `planner_queue_item.lease_expires_at`, port methods, migration `0001_b3_sm_lease`
- `packages/workflow/**` — DSL + Task SM + optimistic engine + Domain handlers
- `packages/automation/**` — Queue + Worker + Governor + Outbox publisher + Domain handlers
- `apps/desktop` — bootstrap wires real START→Queue; deps `@clime/workflow`/`automation`/`storage`

**Contract compliance:** Queue bypass 0 · Validate skip 0 · Prisma 0 · Playwright 0 · captcha bypass 0 · Export≠sole success (DSL still requires publish).

---

## 4. Slice B3 Acceptance Sign-Off

| Part | Model | Status |
|---|---|---|
| `b3-a` CONTRACT | GROK4.5 | **FROZEN** |
| `b3-b` IMPLEMENT workflow | COMPOSER2.5 | **DONE** |
| `b3-c` IMPLEMENT automation | COMPOSER2.5 | **DONE** |
| `b3-d` PROVE | GROK4.5 | **GREEN** |

**Next to-do:** `c1-a` — GROK4.5 — Content Generate→Validate→Optimize contract (`vg-a→e` remains after `g-d` + `c1-d` per plan).
