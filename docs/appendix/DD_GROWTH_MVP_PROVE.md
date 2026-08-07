# D-D Growth MVP Prove (GREEN)

**Status:** GREEN — plan to-do `d-d` (GROK4.5/256K)  
**Date:** 2026-08-07  
**SSOT parents:** [`DA_RESEARCH_TOPIC_CONTRACT.md`](DA_RESEARCH_TOPIC_CONTRACT.md), [`VGA_VIRAL_GROWTH_CONTRACT.md`](VGA_VIRAL_GROWTH_CONTRACT.md) §2 / §4, [`06_GROWTH.md`](../architecture/06_GROWTH.md)  
**Packages:** `@clime/growth-research` · `@clime/growth-planning` · desktop GrowthAPI wiring

---

## 1. Acceptance checklist

| # | Gate Item | Status | Verification |
|---|---|---|---|
| 1 | Topic Generator lives only under `@clime/growth-planning` | **PASS** | `planning/src/topic-generator.ts` + `prove.dd.test.ts` / research boundary forbids Topic |
| 2 | Trend Source + Normalizer + Keyword Graph + Multi-Jack hook under `@clime/growth-research` | **PASS** | `sources.ts` / `normalize.ts` / `keyword-graph.ts` / `multi-jack-hook.ts` |
| 3 | Phase D growth packages = **exactly** `research` + `planning` (no viral god / no module explosion) | **PASS** | `prove.dd.test.ts` directory assert |
| 4 | `buildMultiJackHook` → `paidApiRequired: false`, `kind: growth.multi_jack_content_hook` | **PASS** | research tests + prove |
| 5 | `runResearchJob` works without paid API key (≥1 free source) | **PASS** | `google_trends_public` fixture source |
| 6 | `generateTopic` Mission/Decision pipe → `schema_version` topic candidates | **PASS** | planning tests + prove |
| 7 | Prisma / Supabase / Playwright / vendor SDK = 0; research ↛ planning | **PASS** | boundary tests |
| 8 | `pnpm lint` / `typecheck` / `test` GREEN | **PASS** | monorepo after D |

---

## 2. Test verification

| Package | Tests |
|---|---|
| `@clime/growth-research` | `research.test.ts` · `boundary.test.ts` · `prove.dd.test.ts` |
| `@clime/growth-planning` | `planning.test.ts` · `boundary.test.ts` · `prove.dd.test.ts` |
| `@clime/desktop` | bootstrap registers research + planning growth handlers |

---

## 3. Changed paths (Phase D handoff)

- `docs/appendix/DA_RESEARCH_TOPIC_CONTRACT.md` — FROZEN contract (`d-a`)
- `docs/appendix/DD_GROWTH_MVP_PROVE.md` — this prove
- `packages/growth/research/**` — Trend Source / Normalizer / Keyword Graph / Multi-Jack content hook
- `packages/growth/planning/**` — Topic Generator + Mission/Decision pipe
- `packages/domain-api` — growth methods: `getNormalizedTrends`, `buildMultiJackHook`, `generateTopic`
- `apps/desktop` — wires research + planning handlers
- `pnpm-workspace.yaml` — `packages/growth/*`
- `eslint.config.js` — renderer forbidden `@clime/growth-*`
- `docs/setup/03_NEXT_ACTIONS.md` — D marked done

**Contract compliance:** Topic home=planning · Trend/Normalizer/Keyword=research · Multi-Jack seed only (vg-c variants 0) · paid trend API 0 · Growth umbrella 5 only · Prisma 0.

---

## 4. Slice D Acceptance Sign-Off

| Part | Model | Status |
|---|---|---|
| `d-a` CONTRACT | GROK4.5 | **FROZEN** |
| `d-b` IMPLEMENT research | COMPOSER2.5 | **DONE** |
| `d-c` IMPLEMENT planning Topic | COMPOSER2.5 | **DONE** |
| `d-d` PROVE | GROK4.5 | **GREEN** |

**Next to-do:** ~~`e-a`~~ → Phase E GREEN (`e-a`→`e-d`). Next: `f-a` — COMPOSER2.5 — Brand + challenge E2E.
