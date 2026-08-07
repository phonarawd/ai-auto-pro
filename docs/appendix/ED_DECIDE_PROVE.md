# E-D Decide Prove (GREEN)

**Status:** GREEN — plan to-do `e-d` (GROK4.5/256K)  
**Date:** 2026-08-07  
**SSOT parents:** [`EA_REVENUE_DECISION_CONTRACT.md`](EA_REVENUE_DECISION_CONTRACT.md), [`06_GROWTH.md`](../architecture/06_GROWTH.md), [`05_WORKFLOW.md`](../architecture/05_WORKFLOW.md)  
**Packages:** `@clime/growth-revenue` · `@clime/growth-decision` · planning Queue producer · desktop Mission Center wiring

---

## 1. Acceptance checklist

| # | Gate Item | Status | Verification |
|---|---|---|---|
| 1 | Daily priority emitter lives **only** under `@clime/growth-decision` (`runDailyDecision`) | **PASS** | `prove.ed.test.ts` + engine |
| 2 | Executive / Meta paths do **not** write daily `DecisionRecord` or daily Mission rank | **PASS** | no `@clime/meta`; revenue/planning forbid `decisions.create` / `runDailyDecision`; narrative asserts Executive non-interference |
| 3 | Revenue Prioritizer outputs always include `isEstimate: true` + `estimateLabel: "추정"` | **PASS** | revenue `prove.ed.test.ts` + Zod schemas |
| 4 | Decision Graph persisted on `DecisionRecord.graphJson` with `kind: growth.decision_graph` | **PASS** | decision tests + `decisionGraphSchema` |
| 5 | `runDailyDecision` enqueues Planner Queue **via** `planning.enqueueFromDecision` | **PASS** | queue item ids > 0; `status=ready` |
| 6 | Decision package never calls Worker lease / Workflow run-as-worker | **PASS** | boundary tests (no automation/workflow/lease) |
| 7 | `getMissionToday` returns missions + `decisionExplain` linked to Decision narrative | **PASS** | decision + prove tests |
| 8 | Mission Center Zone E displays Decision explain (Domain API path) | **PASS** | `MissionCenterFrame` uses `decisionExplain` / `runDailyDecision` |
| 9 | Growth packages for E: `research` + `planning` + `decision` + `revenue` (no viral) | **PASS** | `prove.ed.test.ts` directory assert |
| 10 | Prisma / Supabase / Playwright / vendor SDK deps = 0 | **PASS** | boundary tests |
| 11 | `pnpm lint` / `typecheck` / `test` GREEN | **PASS** | monorepo after E |

---

## 2. Test verification

| Package | Tests |
|---|---|
| `@clime/growth-revenue` | `revenue.test.ts` · `boundary.test.ts` · `prove.ed.test.ts` |
| `@clime/growth-decision` | `decision.test.ts` · `boundary.test.ts` · `prove.ed.test.ts` |
| `@clime/growth-planning` | `enqueueFromDecision` producer test |
| `@clime/desktop` | bootstrap wires revenue + decision handlers (seed-gated) |

---

## 3. Changed paths (Phase E handoff)

- `docs/appendix/EA_REVENUE_DECISION_CONTRACT.md` — FROZEN contract (`e-a`)
- `docs/appendix/ED_DECIDE_PROVE.md` — this prove
- `packages/growth/revenue/**` — Prioritizer + 추정 라벨
- `packages/growth/decision/**` — Decision Engine + Graph + Mission today
- `packages/growth/planning/src/queue-producer.ts` — Decision→Queue producer
- `packages/domain-api` — `estimateRevenue` / `prioritizeRevenue` / `runDailyDecision`
- `apps/desktop` — handler wiring + Mission Center Decision explain
- `eslint.config.js` — renderer forbidden `@clime/growth-decision|revenue`
- `docs/setup/03_NEXT_ACTIONS.md` — E marked done

**Contract compliance:** Daily=Decision only · Executive 미간섭 · Decision→Planner Queue (Workers 직행 0) · 추정 라벨 · Prisma 0.

---

## 4. Slice E Acceptance Sign-Off

| Part | Model | Status |
|---|---|---|
| `e-a` CONTRACT | GROK4.5 | **FROZEN** |
| `e-b` IMPLEMENT revenue | COMPOSER2.5 | **DONE** |
| `e-c` IMPLEMENT decision + MC | COMPOSER2.5 | **DONE** |
| `e-d` PROVE | GROK4.5 | **GREEN** |

**Next to-do:** `f-a` — COMPOSER2.5 — Brand + challenge E2E (per plan click order).
