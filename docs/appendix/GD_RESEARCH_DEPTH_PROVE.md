# G-D Research Depth Prove (GREEN)

**Status:** GREEN — plan to-do `g-d` (GROK4.5/256K)  
**Date:** 2026-08-07  
**SSOT parents:** [`GA_RESEARCH_DEPTH_CONTRACT.md`](GA_RESEARCH_DEPTH_CONTRACT.md), [`VGA_VIRAL_GROWTH_CONTRACT.md`](VGA_VIRAL_GROWTH_CONTRACT.md) §2, [`06_GROWTH.md`](../architecture/06_GROWTH.md)  
**Packages:** `@clime/growth-research` · `@clime/domain-api`

---

## 1. Acceptance checklist

| # | Gate Item | Status | Verification |
|---|---|---|---|
| 1 | Researcher / Competitor / Gap / Opportunity / Viral / Micro-Audit seats **only** under `packages/growth/research/src/` | **PASS** | `prove.gd.test.ts` file seats |
| 2 | Top-level packages `viral` · `competitor` · `gap` · `opportunity` · `researcher` · `micro-audit` = **0** | **PASS** | `prove.gd.test.ts` packages root scan |
| 3 | Growth dirs ⊆ `{research,planning,decision,revenue,knowledge}` | **PASS** | `prove.gd.test.ts` umbrella assert |
| 4 | `runMicroAudit` → `growth.micro_audit_teardown`, `paidApiRequired: false`, no PDF/referral | **PASS** | `depth.test.ts` · `prove.gd.test.ts` |
| 5 | Opportunity rows carry `isEstimate: true` + `estimateLabel: "추정"` | **PASS** | `depth.test.ts` · `prove.gd.test.ts` |
| 6 | Competitor/Micro-Audit reject session/captcha paths | **PASS** | `depth.test.ts` |
| 7 | Domain channels for depth methods registered | **PASS** | `domain-api` metadata + `prove.s3e` (100 channels) |
| 8 | Prisma / Supabase / Playwright / vendor / PDF deps = 0 | **PASS** | `boundary.test.ts` · `prove.gd.test.ts` |
| 9 | `pnpm lint` / `typecheck` / `test` GREEN | **PASS** | monorepo after G |

---

## 2. Test verification

| Package | Tests |
|---|---|
| `@clime/growth-research` | `depth.test.ts` · `prove.gd.test.ts` · `boundary.test.ts` |
| `@clime/domain-api` | `prove.s3e.test.ts` channel count + `runResearcherJob` [A] |

---

## 3. Changed paths (Phase G handoff)

- `docs/appendix/GA_RESEARCH_DEPTH_CONTRACT.md` — FROZEN module map (`g-a`)
- `docs/appendix/GD_RESEARCH_DEPTH_PROVE.md` — this prove
- `packages/growth/research/src/{researcher,competitor,micro-audit,gap,opportunity,viral}.ts`
- `packages/growth/research` — schemas / persist / engine / api / tests
- `packages/domain-api` — growth depth methods (+7 → 100 channels)
- `docs/setup/03_NEXT_ACTIONS.md` — G marked done

**Contract compliance:** All depth under `growth/research` · top-level engine 유출 0 · Growth 5 umbrella · Micro-Audit = vg-a §1 base only (PDF=`vg-b`) · paid API 0 · 추정 labels on Opportunity.

---

## 4. Slice G Acceptance Sign-Off

| Part | Model | Status |
|---|---|---|
| `g-a` CONTRACT | GROK4.5 | **FROZEN** |
| `g-b` IMPLEMENT Researcher+Competitor+Micro-Audit | COMPOSER2.5 | **DONE** |
| `g-c` IMPLEMENT Gap+Opportunity+Viral | COMPOSER2.5 | **DONE** |
| `g-d` PROVE | GROK4.5 | **GREEN** |

**Next to-do:** `vg-b` — COMPOSER2.5 — Micro-Audit PDF/infographic + badge + referral (depends on `g-b` DONE).

---

## 5. Explicit non-goals confirmed still out

- Micro-Audit PDF / badge / referral (`vg-b`)
- Multi-Jack variants (`vg-c`)
- `.clime` (`vg-d`)
- Competitor Spy+ / Listening+ (L+)
- Daily Decision emission from Opportunity/Researcher
