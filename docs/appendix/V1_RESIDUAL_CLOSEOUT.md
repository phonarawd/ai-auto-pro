# V1 Residual Close-out (GREEN)

**Status:** GREEN — post-V1 residual gaps closed (2026-08-07)  
**Scope:** Plan residual only (not Phase L+)

---

## Closed gaps

| Gap | Resolution |
|---|---|
| `packages/tool` missing from package map | `@clime/tool` lean FS/OCR/browser-profile home; Playwright still BAE-only |
| IA residual screens | `IaSurfaces` drawer: Projects · Account Manager · Tools/Profiles · Content · Templates · Queue/Calendar/Keywords · Analytics · Export backup |
| Plan body stale snapshot (`next = s3-e`) | Plan verification section synced to V1 COMPLETE |
| Unpackaged `.exe` on disk | `scripts/ship-smoke.ps1` **GREEN** → `apps/desktop/release/win-unpacked/CLIME AI Growth Studio.exe` |

---

## Locks retained

- Domain channel count remains **111** (no new IPC methods — wired existing `tool.*`)
- UI → IPC → Domain API only
- Export = backup log only
- Paid Ads / Team Mode / Postgres = still L+

---

## Tests

- `packages/tool` Vitest
- `apps/desktop/src/prove.ia-residual.test.tsx`
- `apps/desktop/src/prove.runtime-shell.test.ts` — loadFile + Electron auto-start + persistent SQLite
- `pnpm run ci:quality` GREEN

## Runtime shell (operator launch)

| Item | Status |
|---|---|
| `startDesktopApp()` on Electron entry | **fixed** |
| Mission Center `dist/renderer` via `loadFile` | **fixed** |
| SQLite under `%APPDATA%\clime-growth-studio\data\` | **fixed** |
| `scripts/first-run.ps1` | **added** |
| `electron-updater` default import (ESM) | **fixed** |
| `start` → `@electron/rebuild` better-sqlite3 | **fixed** |
