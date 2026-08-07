# S4.5-C AI Adapter + Cost Prove (GREEN)

**Status:** GREEN — plan to-do `s4.5-c` (GROK4.5/256K)  
**Date:** 2026-08-07  
**Contract:** [`S45A_AI_ADAPTER_COST_CONTRACT.md`](S45A_AI_ADAPTER_COST_CONTRACT.md) §13  
**Parent fortification:** [`XA_FORTIFICATION_CONTRACT.md`](XA_FORTIFICATION_CONTRACT.md) §6 Fault Tolerance (LLM)  
**RFC:** [`07_AI.md`](../architecture/07_AI.md), [`02_CONSTITUTION.md`](../architecture/02_CONSTITUTION.md), [`03_ENGINES.md`](../architecture/03_ENGINES.md)

---

## Prove checklist

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | `@clime/ai` exports `createAIEngine` + Cost Intelligence; Cost **not** under meta | PASS | `prove.s45c.test.ts` — exports present; `packages/meta` absent |
| 2 | Domain trees have **zero** vendor SDK imports | PASS | `prove.s45c.test.ts` greps growth/content/meta/storage/domain-api/…; package.json deps clean |
| 3 | Credentials via `VaultRef` + `Vault.getSecret` only | PASS | `ai.test.ts` — registration JSON lacks plaintext; vault-backed complete |
| 4 | Circuit breaker opens; open adapter skipped; fallback serves | PASS | `ai.test.ts` — cloud fails → ollama; second call skips open cloud |
| 5 | Fallback chain reaches `ollama` when cloud fails | PASS | same |
| 6 | Exponential backoff between retries | PASS | `ai.test.ts` — injectable sleep asserts `[40, 80]` |
| 7 | Cost stub prefers `free_local` → Ollama; budget exhaust path | PASS | `ai.test.ts` cost + `AiBudgetExhaustedError` |
| 8 | Swapping adapters = registration/policy only | PASS | `ai.test.ts` same call-site, different engine wiring |
| 9 | `pnpm lint` / `typecheck` / `test` GREEN | PASS | `@clime/ai` + workspace turbo |

---

## Implementation map

| Area | Role | Key paths |
|---|---|---|
| Engine | Façade + vault resolve + chain | `packages/ai/src/create-ai-engine.ts` |
| Adapters | Fake cloud + Ollama stubs | `packages/ai/src/adapters/*` |
| Breaker | Per-adapter open/half-open/closed | `packages/ai/src/circuit-breaker.ts` |
| Backoff | Exponential (+ jitter option) | `packages/ai/src/backoff.ts` |
| Cost | Stub propose / budget / usage | `packages/ai/src/cost/cost-intelligence.ts` |
| Contract | FROZEN | `docs/appendix/S45A_AI_ADAPTER_COST_CONTRACT.md` |

---

## Locks reaffirmed

- Vendor SDKs only behind Adapters in `packages/ai` (skeleton uses fake/Ollama stubs; real SDKs must stay under `src/adapters/`)
- Cost Intelligence in `@clime/ai` — **never** Meta
- API keys = vault refs only
- Circuit breaker + fallback (cloud → Ollama) + exponential backoff (x-a §6)
- Domain call site = `AIEngine.complete` only — swappable via registry/policy
- Prisma / Supabase client count = **0**

---

## Handoff

| Field | Value |
|---|---|
| Prove id | `s4.5-c` |
| Slice 4.5 | **DONE** (`s4.5-a` → `s4.5-b` → `s4.5-c`) |
| Next to-do | `s5-a` (CI — GitHub Actions + renderer↛engine boundary lint) |
| Recommended model | **COMPOSER2.5** |
| Do not | Put Cost in Meta · Import vendor SDK in domain · Store API keys in Config · Skip breaker/fallback |
