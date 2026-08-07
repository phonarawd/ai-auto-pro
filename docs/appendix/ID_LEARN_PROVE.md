# I-D Learn Prove (GREEN)

**Status:** GREEN — plan to-do `i-d` (GROK4.5/256K)  
**Date:** 2026-08-07  
**SSOT parents:** [`IA_LEARNING_MEMORY_ROI_CONTRACT.md`](IA_LEARNING_MEMORY_ROI_CONTRACT.md), [`11_MEMORY_KNOWLEDGE.md`](../architecture/11_MEMORY_KNOWLEDGE.md), [`02_CONSTITUTION.md`](../architecture/02_CONSTITUTION.md)  
**Packages:** `@clime/learning` · `@clime/memory` · desktop Domain API wiring

---

## 1. Acceptance checklist

| # | Gate Item | Status | Verification |
|---|---|---|---|
| 1 | Reflection / Learning under `@clime/learning` — **Meta pollution 0** | **PASS** | no `@clime/meta` dep/import · no Goal/Decision writes · `prove.id.test.ts` |
| 2 | Auto-promote with `confidence < 0.91` = **0** promotions to `active` | **PASS** | learning `prove.id.test.ts` · `learning.test.ts` |
| 3 | Auto-promote with `confidence ≥ 0.91` → `active` + `namespace=strategy` playbook | **PASS** | learning tests |
| 4 | Memory episodes only (`namespace=memory`) — policies not in Memory | **PASS** | memory tests + prove |
| 5 | ROI→Policy: `proposeFromRoi` → LearningPolicy + Memory ROI episode | **PASS** | learning engine + prove |
| 6 | `acceptProposal` / `rejectProposal` for suggested policies | **PASS** | learning.test.ts |
| 7 | Domain API channels wired in desktop host | **PASS** | `bootstrap-domain-api.ts` |
| 8 | Prisma / Supabase / Playwright / vendor SDK deps = 0 | **PASS** | boundary tests |
| 9 | `pnpm lint` / `typecheck` / `test` GREEN | **PASS** | monorepo after I |

---

## 2. Test verification

| Package | Tests |
|---|---|
| `@clime/learning` | `learning.test.ts` · `boundary.test.ts` · `prove.id.test.ts` |
| `@clime/memory` | `memory.test.ts` · `boundary.test.ts` · `prove.id.test.ts` |
| `@clime/desktop` | bootstrap wires memory + learning handlers (seed-gated) |

---

## 3. Changed paths (Phase I handoff)

- `docs/appendix/IA_LEARNING_MEMORY_ROI_CONTRACT.md` — FROZEN contract (`i-a`)
- `docs/appendix/ID_LEARN_PROVE.md` — this prove
- `packages/learning/**` — Confidence gate · Reflection · proposeFromRoi · strategy playbook
- `packages/memory/**` — episodes/facts · ROI measurement episodes
- `packages/domain-api` — `proposeFromRoi` / `runReflection` / `recordEpisode` channels
- `apps/desktop` — handler wiring
- `docs/setup/03_NEXT_ACTIONS.md` — I marked done

**Contract compliance:** Confidence ≥ 0.91 only auto-promote · Reflection ≠ Meta · ROI→Policy 제안 · `namespace=strategy` · Prisma 0.

---

## 4. Slice I Acceptance Sign-Off

| Part | Model | Status |
|---|---|---|
| `i-a` CONTRACT | GROK4.5 | **FROZEN** |
| `i-b` IMPLEMENT learning + Reflection | COMPOSER2.5 | **DONE** |
| `i-c` IMPLEMENT memory + ROI path | COMPOSER2.5 | **DONE** |
| `i-d` PROVE | GROK4.5 | **GREEN** |

**Next to-do (plan click order):** `j-a` — GROK4.5 — Executive (Meta slim) contract (per plan).

---

## 5. Explicit non-goals confirmed still out

- Meta Executive package / Dashboard (Phase J)
- Cross-project Knowledge Evolution 2.0 (L+)
- Background Memory archiver cron
- Full Governance PolicyRule auto-mutation beyond LearningPolicy + strategy playbook
