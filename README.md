# CLIME AI Growth Operating System

Local Windows Growth OS for **CLIME** (desktop app brand: **CLIME AI Growth Studio**).

This repository currently ships **architecture RFCs + toolchain setup**. Application code starts only after Phase 0 docs are complete and implementation is explicitly approved.

## Quick links

| Path | Purpose |
| --- | --- |
| [docs/setup/00_TOOLCHAIN.md](docs/setup/00_TOOLCHAIN.md) | Required programs |
| [docs/setup/01_DEV_RULES.md](docs/setup/01_DEV_RULES.md) | Dev + constitutional locks |
| [docs/architecture/](docs/architecture/) | 15 RFCs (Phase 0) |
| [scripts/check-toolchain.ps1](scripts/check-toolchain.ps1) | Environment gate |

## Toolchain gate

```powershell
powershell -ExecutionPolicy Bypass -File scripts\check-toolchain.ps1
```

Must be **GREEN** before Phase A (Electron app code).

## Package manager

**pnpm only.** Do not use npm/yarn/bun to install project dependencies.

## Status

1. Toolchain setup & rules — present (`docs/setup/`, `scripts/check-toolchain.ps1`)  
2. Phase 0 — 15 architecture RFCs in [`docs/architecture/`](docs/architecture/)  
3. Phase A+ — implementation (separate approval; toolchain must be GREEN)
