# VG-E Viral Growth Prove (GREEN)

**Status:** GREEN — plan to-do `vg-e` (GROK4.5/256K)  
**Date:** 2026-08-07  
**SSOT parents:** [`VGA_VIRAL_GROWTH_CONTRACT.md`](VGA_VIRAL_GROWTH_CONTRACT.md)  
**Packages:** `@clime/growth-research` · `@clime/workflow` · `@clime/content` · `@clime/domain-api`

---

## 1. Acceptance checklist

| # | Gate Item | Status | Verification |
|---|---|---|---|
| 1 | §1 Micro-Audit teardown + viral PDF/info + badge/referral | **PASS** | `viral-export.test.ts` · `prove.vge.test.ts` |
| 2 | §2 Free trend + Multi-Jack meme/card_news/shorts/threads pack | **PASS** | `viral-export.test.ts` · `prove.vge.test.ts` (`budgetClass=free_local`) |
| 3 | §3 1-click → 7 channels + Validate (c1-b) | **PASS** | `content` REPURPOSE freeze + `prove.c1d` · `prove.vge` §3 |
| 4 | §4 `.clime` schema round-trip + Export backup separation | **PASS** | `clime-playbook.test.ts` · `prove.vge` §4 · `export-pack` forbids `.clime` |
| 5 | Paid API on viral paths = **0** | **PASS** | `paidApiRequired: false` · `budgetClass: free_local` · no vendor deps |
| 6 | No `packages/viral` god-object | **PASS** | `prove.vge.test.ts` packages scan |
| 7 | Queue / Validate / Matrix / challenge locks intact | **PASS** | Import `autoStarted: false`; Export≠유일성공; Validate still required on repurpose |
| 8 | Powered-by badge exact wordmark + https referral | **PASS** | `Powered by CLIME Growth OS` · `https://clime.growth/r/...` |
| 9 | Domain channels +4 (viral IO) | **PASS** | `prove.s3e` → **104** channels |
| 10 | `pnpm lint` / `typecheck` / `test` GREEN | **PASS** | monorepo after VG |

---

## 2. Module seats (no god-object)

| Owner | Path |
|---|---|
| vg-b | `packages/growth/research/src/{referral-badge,pdf-lite,micro-audit-export}.ts` |
| vg-c | `packages/growth/research/src/multi-jack-pack.ts` |
| vg-d | `packages/workflow/src/clime-playbook.ts` |
| §3 | `@clime/content` Repurpose (unchanged owner) |

**Forbidden confirmed absent:** `packages/viral`.

---

## 3. Slice VG Acceptance Sign-Off

| Part | Model | Status |
|---|---|---|
| `vg-a` CONTRACT | GROK4.5 | **FROZEN** |
| `vg-b` IMPLEMENT Micro-Audit PDF+badge | COMPOSER2.5 | **DONE** |
| `vg-c` IMPLEMENT Multi-Jack pack | COMPOSER2.5 | **DONE** |
| `vg-d` IMPLEMENT `.clime` IO | COMPOSER2.5 | **DONE** |
| `vg-e` PROVE | GROK4.5 | **GREEN** |

**Next to-do (plan click order):** `h-a` / Planning + Experiments (COMPOSER2.5) — after VG wave.

---

## 4. Explicit non-goals confirmed still out

- Marketplace storefront (L+)
- Paid trend firehose / paid LLM on viral paths
- Hero floating promo stickers on Mission Center
- Merging Export backup with `.clime`
