# Toolchain — CLIME AI Growth OS (V1)

Canonical stack for Windows desktop development. Install/verify with `scripts/check-toolchain.ps1`.

## Required (block Phase A app code if missing)

| Tool | Why | Target |
| --- | --- | --- |
| **Node.js** | Electron / Next / TypeScript runtime | `>=22.12` (prefer **22 LTS** via fnm; Node 24 OK if Electron engines allow) |
| **pnpm** | Sole package manager (no yarn/npm install for deps) | `>=9` (current OK: 11.x) |
| **Git** | Versioning + GitHub | `>=2.40` |
| **GitHub CLI (`gh`)** | Repo/PR ops | authenticated |
| **VS 2022 Build Tools** + **MSVC + Windows SDK** | Native modules (`better-sqlite3`, Electron rebuild) | VCTools workload |
| **Python 3.12+** | `node-gyp` for native builds | on PATH |

## Strongly recommended

| Tool | Why |
| --- | --- |
| **fnm** | Pin Node version per repo (`.node-version`) |
| **Ollama** | Local LLM adapter (No AI Vendor Dependency) |
| **sqlite3 CLI** | Inspect SQLite DB during debug |
| **Docker** | Optional Postgres later / isolated tools |
| **Cursor** | Primary IDE for RFC-driven implementation |
| **7-Zip** | Artifact inspection |

## Explicitly NOT required for V1

- Yarn, Chocolatey
- Java / .NET SDK
- Rust (unless a specific native crate is adopted later)
- Postgres/Supabase (Repository port later; SQLite first)
- Universal browser-automation toolchain in core

## Package manager lock

```text
ALLOWED:  pnpm install / pnpm add / pnpm exec / pnpm dlx
FORBIDDEN in this repo: npm install, yarn, bun install (bun may exist globally — do not use for this project)
```

Lockfile: `pnpm-lock.yaml` only.

## Secrets

- Never commit API keys, OAuth tokens, session cookies.
- Use OS keychain / Vault refs only.
- `.env*` local files must stay gitignored.

## Disk note

VS Build Tools + Ollama installers are multi‑GB. Keep **≥20 GB free** on `C:` before native Electron packaging (`check-toolchain` **FAIL** if below 20 GB; ship smoke: `scripts/ship-smoke.ps1`). See [`06_SHIP.md`](06_SHIP.md).

## Verification

```powershell
pwsh -File scripts/check-toolchain.ps1
# or
powershell -ExecutionPolicy Bypass -File scripts\check-toolchain.ps1
```

Exit code `0` = green for Phase 0→A. Non‑zero = fix listed FAIL items first.
