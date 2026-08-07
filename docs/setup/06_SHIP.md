# Ship — Installer · Updater · Code signing (Phase K2)

**App brand:** CLIME AI Growth Studio  
**Artifact:** `CLIME AI Growth Studio.exe`  
**Config:** [`apps/desktop/electron-builder.yml`](../../apps/desktop/electron-builder.yml)  
**Brand SSOT (code):** [`apps/desktop/src/ship/brand.ts`](../../apps/desktop/src/ship/brand.ts)

---

## 0. Native rebuild note

Packaging rebuilds `better-sqlite3` against the Electron ABI (`@electron/rebuild`).

- Require **`better-sqlite3` ≥ 12.11** with **Electron 43** (older 11.x fails V8 External API compile).
- VS 2022 Build Tools + Windows SDK must be present (`check-toolchain` GREEN).
- If rebuild fails after a fresh MSVC install: **restart Windows once**, open a new terminal, retry `ship-smoke`.
- `@electron/rebuild` during `pack`/`dist:win` overwrites the shared native binary for the **Electron ABI**. After packaging, restore Node for tests: `pnpm --filter @clime/storage exec npm rebuild better-sqlite3` (also done automatically at the end of `ship-smoke.ps1`).

---

## 1. Disk gate (운영 노트)

Electron packaging + VS Build Tools + native rebuilds need headroom.

| Rule | Threshold |
|---|---|
| **Minimum free on `C:` before pack/dist** | **≥ 20 GB** |
| Recommended | ≥ 25 GB |

```powershell
# Toolchain gate (fails if C: < 20 GB)
powershell -ExecutionPolicy Bypass -File scripts\check-toolchain.ps1

# Ship smoke (disk + config + unpackaged .exe)
powershell -ExecutionPolicy Bypass -File scripts\ship-smoke.ps1
```

If free space is below 20 GB: free disk **before** `pnpm --filter @clime/desktop pack` / `dist:win`. Do not start a full NSIS build on a nearly full drive.

---

## 2. Installer path

| Step | Command / path |
|---|---|
| Build TS | `pnpm --filter @clime/desktop build` |
| Unpackaged smoke (`.exe` without NSIS) | `pnpm --filter @clime/desktop pack` → `apps/desktop/release/win-unpacked/CLIME AI Growth Studio.exe` |
| Windows installer (NSIS) | `pnpm --filter @clime/desktop dist:win` → `apps/desktop/release/CLIME AI Growth Studio.exe` |
| Local run (dev) | `pnpm --filter @clime/desktop start` (after `build`) |

`release/` is gitignored. Never commit `.exe` / `.blockmap` / certs.

---

## 3. electron-updater path

- Runtime: `apps/desktop/src/main/auto-updater.ts` via `setupAutoUpdater()` in `startDesktopApp()`.
- Active **only when `app.isPackaged`** — no network in vitest/dev.
- Feed URL: `electron-builder.yml` → `publish.provider: generic` + `publish.url` (default placeholder `https://updates.clime.local/growth-studio/`).
- Operators replace the generic URL with a real HTTPS feed (or switch to GitHub Releases publish) before production rollout.
- Update artifacts: same brand `productName`; clients expect `latest.yml` + matching `.exe` / `.blockmap` on the feed.

---

## 4. Code signing 인지 (aware — not skipped)

Windows SmartScreen treats **unsigned** installers as unknown. V1 ship is **code-sign aware**:

| Item | Guidance |
|---|---|
| Local smoke / CI config prove | Unsigned OK (`signAndEditExecutable: false` in builder yml) |
| Production / operator machines | Prefer Authenticode (EV or OV) so SmartScreen reputation builds |
| electron-builder env | `CSC_LINK` = path to `.pfx`/`.p12`; `CSC_KEY_PASSWORD` = password |
| Alternative | Windows certificate store / Azure Trusted Signing (operator-owned) |
| Secrets | **Never** commit certs, passwords, or `.pfx` — already blocked by `.gitignore` (`*.pem`, `*.key`, secrets/) |
| Updater | When signed, set `verifyUpdateCodeSignature: true` for production feeds |

Unsigned smoke proves the **installer path**; it does **not** claim production-ready reputation.

---

## 5. Brand lock

| Surface | Required string |
|---|---|
| Window title / productName | `CLIME AI Growth Studio` |
| Windows executable | `CLIME AI Growth Studio.exe` |
| Architecture name (docs) | `CLIME AI Growth Operating System` |

Do not ship under AutoPoster / generic Electron defaults.

---

## 6. V1 DoD deploy items (K2)

- [x] electron-builder + electron-updater configured
- [x] Brand = CLIME AI Growth Studio on installer/exe path
- [x] Install + update paths documented (this file)
- [x] Code-signing awareness documented (unsigned smoke allowed)
- [x] Disk ≥20 GB operating note + smoke gate
- [x] Ship smoke script + Prove (`k2-c`)
