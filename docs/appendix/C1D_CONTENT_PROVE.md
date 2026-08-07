# C1-D Content Prove (GREEN)

**Status:** GREEN — plan to-do `c1-d` (GROK4.5/256K)  
**Date:** 2026-08-07  
**SSOT parents:** [`C1A_CONTENT_CONTRACT.md`](C1A_CONTENT_CONTRACT.md), [`VGA_VIRAL_GROWTH_CONTRACT.md`](VGA_VIRAL_GROWTH_CONTRACT.md) §3 + Export≠`.clime`, [`08_CONTENT.md`](../architecture/08_CONTENT.md)  
**Package:** `@clime/content` · desktop ContentAPI wiring

---

## 1. Acceptance checklist

| # | Gate Item | Status | Verification |
|---|---|---|---|
| 1 | `@clime/content` exists; Prisma/Supabase/Playwright/vendor SDK deps = 0 | **PASS** | `boundary.test.ts` |
| 2 | Optimize/Repurpose on `draft` → `VALIDATE_REQUIRED` (Validate skip = 0) | **PASS** | `content.test.ts` + `prove.c1d.test.ts` |
| 3 | Repurpose produces all **7** channel ids; each Validate’d | **PASS** | `content.test.ts` / `prove.c1d.test.ts` vs vg-a §3 freeze |
| 4 | `exportPack` → `Exports/YYYY-MM-DD/` only; manifest `kind=content.export_backup`; `.clime` = 0 | **PASS** | `content.test.ts` export case |
| 5 | History append accepts only frozen enums; unknown rejected | **PASS** | `parseHistoryKind` + `appendHistorySafe` tests |
| 6 | Export ≠ sole publish success (no `posted_*` from export) | **PASS** | history kinds after export |
| 7 | `pnpm lint` / `typecheck` / `test` GREEN | **PASS** | monorepo after C1 |

---

## 2. Test verification

| Package | Tests |
|---|---|
| `@clime/content` | `content.test.ts` · `boundary.test.ts` · `prove.c1d.test.ts` |
| `@clime/desktop` | bootstrap registers `content.*` handlers (existing host registry) |

---

## 3. Changed paths (C1 handoff)

- `docs/appendix/C1A_CONTENT_CONTRACT.md` — FROZEN contract (`c1-a`)
- `docs/appendix/C1D_CONTENT_PROVE.md` — this prove
- `packages/content/**` — Produce / Validate / Optimize / 7-channel Repurposer / Export backup / History enums
- `apps/desktop` — wires Content domain handlers; dep `@clime/content`
- `docs/setup/03_NEXT_ACTIONS.md` — C1 marked done

**Contract compliance:** Validate skip 0 · Export=backup only · `.clime` writer 0 · History enum drift 0 · Prisma 0 · Playwright 0 · vendor SDK 0.

---

## 4. Slice C1 Acceptance Sign-Off

| Part | Model | Status |
|---|---|---|
| `c1-a` CONTRACT | GROK4.5 | **FROZEN** |
| `c1-b` IMPLEMENT Produce/Validate/Optimize/Repurpose | COMPOSER2.5 | **DONE** |
| `c1-c` IMPLEMENT Export + History | COMPOSER2.5 | **DONE** |
| `c1-d` PROVE | GROK4.5 | **GREEN** |

**Next to-do:** `d-a` — GROK4.5 — Research MVP + Topic contract (`c2` GREEN).
