# H-C Planning + Experiment Prove (GREEN)

**Status:** GREEN — plan to-do `h-c` (GROK4.5/256K)  
**Date:** 2026-08-07  
**SSOT parents:** [`06_GROWTH.md`](../architecture/06_GROWTH.md), [`09_ANALYTICS.md`](../architecture/09_ANALYTICS.md), [`05_WORKFLOW.md`](../architecture/05_WORKFLOW.md), [`XA_FORTIFICATION_CONTRACT.md`](XA_FORTIFICATION_CONTRACT.md) §5 HumanGate, [`EA_REVENUE_DECISION_CONTRACT.md`](EA_REVENUE_DECISION_CONTRACT.md)  
**Packages:** `@clime/growth-planning` · `@clime/analytics` · desktop Domain API wiring

---

## 1. Acceptance checklist

| # | Gate Item | Status | Verification |
|---|---|---|---|
| 1 | Planner Queue producer polish lives in `@clime/growth-planning` | **PASS** | `queue-producer.ts` + `scheduler-intelligence.ts` |
| 2 | Volume buffering caps Decision→Queue intake | **PASS** | `planning.test.ts` · `prove.hc.test.ts` |
| 3 | Scheduler Intelligence fills advisory deadlines (Automation owns cron) | **PASS** | deadline set · `scheduleCadenceHint` on payload · no `@clime/automation` import |
| 4 | Decision→Queue via `enqueueFromDecision` only; Workers 직행 0 | **PASS** | `status=ready` · `leasedBy=null` · boundary forbids lease/automation |
| 5 | `@clime/analytics` Experiment A/B skeleton (title/thumb/CTA arms) | **PASS** | `experimentDocSchema` · organic create test |
| 6 | Spend-like create → HumanGate; `autoSpendApplied` always **0** | **PASS** | `BLOCKED_HUMAN` without approval; approved still `autoSpendApplied=0` |
| 7 | Analytics does **not** emit Planner Queue / daily Decision | **PASS** | analytics `prove.hc` + boundary (no planning/decision/automation) |
| 8 | Domain exit 0 — Growth umbrella / package homes intact | **PASS** | Topic=`planning`; Experiment=`analytics`; no `packages/viral` / `packages/ads` |
| 9 | Desktop wires `analytics.createExperiment` / `listExperiments` | **PASS** | `bootstrap-domain-api.ts` |
| 10 | Prisma / Supabase / Playwright / vendor SDK deps = 0 | **PASS** | boundary tests |
| 11 | `pnpm lint` / `typecheck` / `test` GREEN | **PASS** | monorepo after H |

---

## 2. Test verification

| Package | Tests |
|---|---|
| `@clime/growth-planning` | `planning.test.ts` · `boundary.test.ts` · `prove.hc.test.ts` |
| `@clime/analytics` | `analytics.test.ts` · `boundary.test.ts` · `prove.hc.test.ts` |
| `@clime/desktop` | bootstrap wires analytics handlers (seed-gated) |

---

## 3. Changed paths (Phase H handoff)

- `packages/growth/planning/src/scheduler-intelligence.ts` — volume buffer + advisory deadlines
- `packages/growth/planning/src/queue-producer.ts` — H polish (deadline / deps / humanApproval / buffer)
- `packages/analytics/**` — Experiment A/B skeleton + HumanGate spend seat
- `packages/domain-api` — analytics createExperiment stub/types (HumanGate fields)
- `apps/desktop` — `@clime/analytics` handler wiring
- `docs/appendix/HC_PLANNING_EXPERIMENT_PROVE.md` — this prove
- `docs/setup/03_NEXT_ACTIONS.md` — H marked done

**Contract compliance:** Queue producer = planning only · Scheduler intel advisory · spend HumanGate · auto spend 0 · Analytics ↛ daily mix / Queue · Prisma 0.

---

## 4. Slice H Acceptance Sign-Off

| Part | Model | Status |
|---|---|---|
| `h-a` IMPLEMENT Planner Queue + Scheduler | COMPOSER2.5 | **DONE** |
| `h-b` IMPLEMENT Experiment A/B + HumanGate | COMPOSER2.5 | **DONE** |
| `h-c` PROVE | GROK4.5 | **GREEN** |

**Next to-do (plan click order):** `i-a` — GROK4.5 — Learning + Memory + ROI contract (per plan). _(Slice I complete — see [`ID_LEARN_PROVE.md`](ID_LEARN_PROVE.md); next `j-a`.)_

---

## 5. Explicit non-goals confirmed still out

- Full Paid Ads OS / multivariate landing scale-up (L+)
- Auto-spend or spend UI without HumanGate
- Analytics emitting Planner Queue items
- Second daily ranker in Scheduler / Recommendation
