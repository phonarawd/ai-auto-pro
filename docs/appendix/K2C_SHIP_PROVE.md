# K2-C Ship Prove (GREEN)

**Status:** GREEN — plan to-do `k2-c` (GROK4.5/256K)  
**Date:** 2026-08-07  
**SSOT parents:** [`15_DESKTOP_AND_ROADMAP.md`](../architecture/15_DESKTOP_AND_ROADMAP.md), [`01_PRODUCT.md`](../architecture/01_PRODUCT.md), [`06_SHIP.md`](../setup/06_SHIP.md)  
**Package:** `@clime/desktop`

---

## 1. Acceptance checklist

| # | Gate Item | Status | Verification |
|---|---|---|---|
| 1 | electron-builder configured (`productName` = CLIME AI Growth Studio) | **PASS** | `electron-builder.yml` · `prove.k2c.test.ts` |
| 2 | electron-updater wired (`setupAutoUpdater`, packaged-only) | **PASS** | `main/auto-updater.ts` · `main/index.ts` |
| 3 | Brand / exe string lock (`CLIME AI Growth Studio.exe`) | **PASS** | `ship/brand.ts` · builder `artifactName` |
| 4 | Installer path documented + smoke script | **PASS** | `06_SHIP.md` · `scripts/ship-smoke.ps1` |
| 5 | Code-signing awareness (unsigned smoke OK; CSC_* for prod) | **PASS** | `06_SHIP.md` §4 · builder `signAndEditExecutable: false` |
| 6 | Disk ≥20 GB operating note + smoke gate | **PASS** | `06_SHIP.md` · `ship-smoke.ps1` · `check-toolchain` fail `<20GB` |
| 7 | V1 DoD deploy items listed | **PASS** | `06_SHIP.md` §6 |
| 8 | `pnpm lint` / `typecheck` / `test` GREEN (desktop prove) | **PASS** | `@clime/desktop` after K2 |
| 9 | Unpackaged `.exe` smoke (`ship-smoke.ps1`) | **PASS** | `release/win-unpacked/CLIME AI Growth Studio.exe` |
| 10 | `better-sqlite3` ≥12.11 for Electron 43 rebuild | **PASS** | `@clime/storage` bump · native rebuild in pack log |

---

## 2. DoD deploy map (V1 quality · ship)

| DoD item | Where closed |
|---|---|
| `CLIME AI Growth Studio.exe` install path | `pack` → `release/win-unpacked/…` · `dist:win` → `release/…` |
| Update path | generic publish URL + `autoUpdater.checkForUpdatesAndNotify` |
| Code-sign aware | documented; local unsigned smoke allowed |
| Disk ≥20 GB | operate + toolchain + ship-smoke |

---

## 3. Test verification

| Artifact | Role |
|---|---|
| `apps/desktop/src/prove.k2c.test.ts` | Config / brand / updater / docs Prove |
| `scripts/ship-smoke.ps1` | Disk + config + unpackaged `.exe` smoke |
| `docs/setup/06_SHIP.md` | Operator SSOT for installer / sign / updater |

---

## 4. Changed paths (Phase K2 handoff)

- `apps/desktop/electron-builder.yml` — Windows NSIS + publish feed
- `apps/desktop/package.json` — electron-builder / electron-updater / pack scripts
- `apps/desktop/src/ship/brand.ts` — brand SSOT
- `apps/desktop/src/main/auto-updater.ts` — updater
- `apps/desktop/src/main/index.ts` — wire updater + brand title
- `apps/desktop/src/prove.k2c.test.ts` — Prove
- `packages/storage` — `better-sqlite3` ^12.11 (Electron 43 V8 rebuild)
- `docs/setup/06_SHIP.md` — ship ops
- `docs/setup/04_HOW_TO_OPERATE.md` — ship pointer
- `scripts/ship-smoke.ps1` — smoke
- `scripts/check-toolchain.ps1` — disk FAIL `<20GB`
- `docs/appendix/K2C_SHIP_PROVE.md` — this prove
- `docs/setup/03_NEXT_ACTIONS.md` — K2 marked done

**Contract compliance:** brand lock · updater packaged-only · code-sign aware · disk ≥20GB · Export/publish ladder unchanged.

---

## 5. Slice K2 Acceptance Sign-Off

| Part | Model | Status |
|---|---|---|
| `k2-a` electron-builder + updater | COMPOSER2.5 | **DONE** |
| `k2-b` .exe smoke + sign docs + disk note | COMPOSER2.5 | **DONE** |
| `k2-c` PROVE | GROK4.5 | **GREEN** |

**Next to-do (plan click order):** ~~`x-b`~~ **DONE GREEN** → `v1-a` — GROK4.5 — V1 Acceptance / DoD sign-off.

---

## 6. Explicit non-goals confirmed still out

- Mandatory production code-signing cert in CI (operator-owned)
- Auto-publish of releases to a public feed without human gate
- Phase L+ Team Mode / Paid Ads OS
- Postgres/Supabase product path
