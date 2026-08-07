# CLIME AI Growth Operating System

Local Windows Growth OS for **CLIME** (desktop app brand: **CLIME AI Growth Studio**).

V1 core loop: **research → decide → generate → validate → auto-publish → measure → learn**.
Publish ladder: official API (P0) → BAE session auto-publish (P1); Export is a **backup log**. Paid Ads spend is always **HumanGate**.

This repository ships **architecture RFCs + toolchain setup**. Phase A implementation is **APPROVED** ([`05_IMPL_APPROVAL.md`](docs/setup/05_IMPL_APPROVAL.md)); app scaffolding may proceed per the roadmap.

## Quick links

| Path | Purpose |
| --- | --- |
| [docs/setup/00_TOOLCHAIN.md](docs/setup/00_TOOLCHAIN.md) | Required programs |
| [docs/setup/01_DEV_RULES.md](docs/setup/01_DEV_RULES.md) | Dev + constitutional locks |
| [docs/setup/03_NEXT_ACTIONS.md](docs/setup/03_NEXT_ACTIONS.md) | Next actions |
| [docs/setup/04_HOW_TO_OPERATE.md](docs/setup/04_HOW_TO_OPERATE.md) | Beginner operate / approve / rollback |
| [docs/setup/05_IMPL_APPROVAL.md](docs/setup/05_IMPL_APPROVAL.md) | Phase A approval gate (APPROVED) |
| [docs/setup/06_SHIP.md](docs/setup/06_SHIP.md) | Installer / updater / code-signing (K2) |
| [docs/setup/07_BEGINNER_USER_MANUAL.md](docs/setup/07_BEGINNER_USER_MANUAL.md) | **왕초보 사용 설명서 (전체 기능)** |
| [docs/architecture/](docs/architecture/) | 16 RFCs (Phase 0 + Design Gate `16`) |
| [scripts/check-toolchain.ps1](scripts/check-toolchain.ps1) | Environment gate |
| [scripts/check-phase0.ps1](scripts/check-phase0.ps1) | Phase 0 docs/SSOT quality gate |
| [scripts/ship-smoke.ps1](scripts/ship-smoke.ps1) | `.exe` ship smoke (disk ≥20GB + unpackaged exe) |

## Toolchain gate

```powershell
powershell -ExecutionPolicy Bypass -File scripts\check-toolchain.ps1
```

Must be **GREEN** before Phase A (Electron app code).

## Phase 0 quality gate

```powershell
powershell -ExecutionPolicy Bypass -File scripts\check-phase0.ps1
npx --yes markdownlint-cli2
```

Must be **GREEN** (0 failures) before Phase A approval.

## Locked toolchain (V1)

| Area | Choice |
| --- | --- |
| Monorepo | pnpm workspaces + Turborepo |
| ORM / DB | Drizzle + SQLite (Repository) |
| Schema | Zod + `schema_version` |
| UI | Tailwind + shadcn/ui + Pretendard |
| Test / Lint | Vitest + Playwright + ESLint + Prettier |
| Ship | electron-builder + electron-updater |

**pnpm only.** Do not use npm/yarn/bun to install project dependencies.

## Monorepo (Phase A)

```powershell
pnpm install
pnpm build
pnpm run ci:quality   # lint + typecheck + test (same as GitHub Actions CI)
```

Workspaces: `apps/*`, `packages/*`. Task graph: Turborepo. Package manager: **pnpm only**. CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Status

1. Toolchain setup & rules — present (`docs/setup/`, `scripts/check-toolchain.ps1`)
2. Phase 0 — architecture RFCs in [`docs/architecture/`](docs/architecture/) — **complete**; Design Gate [`16_DESIGN_SYSTEM.md`](docs/architecture/16_DESIGN_SYSTEM.md) — **complete**
3. Phase A — **APPROVED**; slices **1**–**6** (monorepo → Design → RFC sync → Storage → Governance → Domain API → Vault → AI → CI → **`@clime/ui`**) **done**
4. **Next (plan order):** Desktop shell(7) → Mission Center v1(8) — see [`03_NEXT_ACTIONS.md`](docs/setup/03_NEXT_ACTIONS.md)
