# F-C Trust Prove (GREEN)

**Status:** GREEN — plan to-do `f-c` (GROK4.5/256K)  
**Date:** 2026-08-07  
**SSOT parents:** plan Phase F; [`XA_FORTIFICATION_CONTRACT.md`](XA_FORTIFICATION_CONTRACT.md) §2 / §3.2; [`C1A_CONTENT_CONTRACT.md`](C1A_CONTENT_CONTRACT.md); [`C2A_PUBLISH_LADDER_CONTRACT.md`](C2A_PUBLISH_LADDER_CONTRACT.md); [`16_DESIGN_SYSTEM.md`](../architecture/16_DESIGN_SYSTEM.md)  
**Packages:** `@clime/growth-research` · `@clime/content` · `@clime/desktop` · `@clime/notification` · `@clime/browser-automation`

---

## 1. Acceptance checklist

| # | Gate Item | Status | Verification |
|---|---|---|---|
| 1 | Brand Intelligence owned by `growth/research` (Knowledge `namespace=brand`) | **PASS** | `brand.test.ts` · `growth.getBrandRules` / `setBrandRules` |
| 2 | Content Validate loads Brand rules (no research import in content) | **PASS** | `loadBrandRules` injection · `content.test.ts` · `prove.fa.test.tsx` |
| 3 | Off-brand / required phrase checks (“CLIME답지 않음”) | **PASS** | Validate `checks.brand` pass/fail/skip |
| 4 | Publishing History UI (Toolbar+Panel+DataRow+Badge) | **PASS** | `PublishingHistoryPanel` · Mission Center entry |
| 5 | History kinds frozen enum only | **PASS** | `prove.fc.test.ts` Zod + `PUBLISHING_HISTORY_KINDS` |
| 6 | Challenge → `PAUSED_CHALLENGE` + Inbox E2E (우회 0) | **PASS** | `e2e.challenge-pause.test.ts` alwaysChallenge ladder |
| 7 | 침묵실패 0 — challenge never writes `posted_*` | **PASS** | `prove.fc.test.ts` + F-B E2E |
| 8 | Inbox pause exposes `traceId`; bypass/captcha-solve CTA = 0 | **PASS** | E2E + renderer source scan |
| 9 | UX Gate surfaces: brand, History, challenge banner, Export=backup label | **PASS** | Mission Center + History + Inbox/Banner asserts |
| 10 | Prisma / Supabase / captcha-bypass code = 0 | **PASS** | boundary + CTA scans |
| 11 | `pnpm lint` / `typecheck` / `test` GREEN | **PASS** | monorepo after F |

---

## 2. Test verification

| Package | Tests |
|---|---|
| `@clime/growth-research` | `brand.test.ts` |
| `@clime/content` | Brand Validate cases in `content.test.ts` |
| `@clime/desktop` | `prove.fa.test.tsx` · `e2e.challenge-pause.test.ts` · `prove.fc.test.ts` |

---

## 3. Changed paths (Phase F handoff)

- `packages/growth/research/**` — Brand Intelligence schema/persist/engine/API
- `packages/content/**` — Validate brand polish + `BrandRulesLoader`
- `packages/domain-api` — `growth.getBrandRules` / `setBrandRules`
- `packages/account` + `browser-automation` — challenge `traceId` propagation
- `apps/desktop` — brand wiring, Publishing History UI, F-B E2E, F-C prove
- `docs/appendix/FC_TRUST_PROVE.md` — this prove
- `docs/setup/03_NEXT_ACTIONS.md` — F marked done

**Contract compliance:** Brand SoT = research · Content consumes only · History enums frozen · challenge→pause+Inbox · bypass CTA 0 · silent `posted_*` 0.

---

## 4. Slice F Acceptance Sign-Off

| Part | Model | Status |
|---|---|---|
| `f-a` IMPLEMENT Brand+History | COMPOSER2.5 | **DONE** |
| `f-b` IMPLEMENT challenge E2E | COMPOSER2.5 | **DONE** |
| `f-c` PROVE Trust | GROK4.5 | **GREEN** |

**Next to-do:** `g-a` — GROK4.5 — Research depth contract (per plan click order).

---

## 5. UX Acceptance Gate (Phase F surfaces)

- [x] First viewport still brand + CTA + status board (History behind toolbar CTA)
- [x] challenge → auto-pause UI + Inbox (no bypass CTA)
- [x] Export exposed as backup only (Mission Center label unchanged)
- [x] Failure / pause exposes Trace ID
- [x] Domain API path only for Brand / History / Validate
- [x] History kinds: `draft` / `export` / `scheduled` / `posted_manual` / `posted_api` / `posted_session`
