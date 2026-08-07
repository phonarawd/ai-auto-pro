# C2-D Publish Prove (GREEN)

**Status:** GREEN — plan to-do `c2-d` (GROK4.5/256K)  
**Date:** 2026-08-07  
**SSOT parents:** [`C2A_PUBLISH_LADDER_CONTRACT.md`](C2A_PUBLISH_LADDER_CONTRACT.md), [`XA_FORTIFICATION_CONTRACT.md`](XA_FORTIFICATION_CONTRACT.md) §2, [`10_ACCOUNT.md`](../architecture/10_ACCOUNT.md)  
**Packages:** `@clime/browser-automation` · desktop publish wiring · Domain `account.publish`

---

## 1. Acceptance checklist

| # | Gate Item | Status | Verification |
|---|---|---|---|
| 1 | `@clime/browser-automation` exists; Playwright imports outside it = 0 | **PASS** | `boundary.test.ts` + ESLint restriction |
| 2 | API path → `posted_api`; session path → `posted_session` | **PASS** | `publish.test.ts` + `prove.c2d.test.ts` |
| 3 | Export alone never writes `posted_*` (Export ≠ sole success) | **PASS** | content export path + DSL still requires `account.publish` |
| 4 | Challenge → `PAUSED_CHALLENGE` + no `posted_*` + bypass CTA = 0 | **PASS** | ladder challenge + desktop Inbox prove + CTA string scan |
| 5 | Gaussian jitter samples clamp to 5–45s; daily quota deny honest | **PASS** | `publish.test.ts` |
| 6 | Session sandbox ids differ per `accountId` | **PASS** | `publish.test.ts` |
| 7 | Matrix badge fields drive publish refuse/allow | **PASS** | `BLOCKED_CAPABILITY` + Mission Center CTA wiring |
| 8 | `pnpm lint` / `typecheck` / `test` GREEN | **PASS** | monorepo after C2 |

---

## 2. Test verification

| Package | Tests |
|---|---|
| `@clime/browser-automation` | `publish.test.ts` · `boundary.test.ts` · `prove.c2d.test.ts` |
| `@clime/desktop` | `prove.c2d.test.ts` (host `account.publish` + Matrix/Inbox) |
| `@clime/workflow` | Existing DSL publish-node requirement (B3) |

---

## 3. Changed paths (C2 handoff)

- `docs/appendix/C2A_PUBLISH_LADDER_CONTRACT.md` — FROZEN contract (`c2-a`)
- `docs/appendix/C2D_PUBLISH_PROVE.md` — this prove
- `packages/browser-automation/**` — BAE home, jitter, quota, sandbox, PublishLadder, handlers
- `packages/domain-api` — `account.publish` method metadata + stub
- `packages/content` — `appendHistorySafe` accepts accountId/externalPostId
- `apps/desktop` — bootstrap wires ladder; Mission Center `[자동게시]` → `account.publish`
- `eslint.config.js` — Playwright import boundary outside BAE
- `plugins/connectors/README.md` — connector Playwright ban note
- `docs/setup/03_NEXT_ACTIONS.md` — C2 marked done

**Contract compliance:** API→session ladder · jitter 5–45s · daily quota · PAUSED_CHALLENGE · session sandbox · Playwright only in BAE · Export≠sole success · captcha bypass 0 · account↛BAE package dep.

---

## 4. Slice C2 Acceptance Sign-Off

| Part | Model | Status |
|---|---|---|
| `c2-a` CONTRACT | GROK4.5 | **FROZEN** |
| `c2-b` IMPLEMENT BAE home + boundary | COMPOSER2.5 | **DONE** |
| `c2-c` IMPLEMENT API/session + Matrix | COMPOSER2.5 | **DONE** |
| `c2-d` PROVE | GROK4.5 | **GREEN** |

**Next to-do:** ~~`d-a`~~ → Phase D GREEN; ~~`e-a`~~ → Phase E GREEN (`e-a`→`e-d`). Next: `f-a` — COMPOSER2.5 — Brand + challenge E2E.
