# Development Rules — Zero Conflict Baseline

These rules exist so Cursor and humans do not re‑introduce duplicates, vendor lock‑in, or schema drift.

## Constitutional locks (must appear in RFC 02)

1. **Plugin Contract First** — Modules register via Manifest; Core never imports module internals.
2. **Schema Versioning** — Every JSON payload for Workflow / Knowledge / Export / Event has `schema_version` (Zod at boundaries).
3. **Task State Machine** — Jobs use: `QUEUED → RUNNING → VALIDATING → OPTIMIZING → READY → PUBLISHED` (plus failure/cancel/`PAUSED_CHALLENGE` in 05_WORKFLOW).
4. **No AI Vendor Dependency** — OpenAI / Gemini / Claude / DeepSeek / Local LLM only behind Adapters.
5. **Everything is a Workflow** — Research, Planning, Revenue, Generate, Validate, Publish, etc. execute as Workflow Nodes.

## Architecture locks (V1 Slim)

- Growth umbrellas only: `research | planning | decision | revenue | knowledge`
- Executive = Week/Month/Quarter; Decision Engine = daily priority only
- Meta = Executive + Goal only
- One Knowledge Store (`namespace` / `type` / `tags`)
- Governance V1 = Feature → Policy → Runtime
- Settings = Global → Project → User
- **Full-auto publish ladder:** API (P0) → BAE session auto-publish (P1); Export = backup log; challenge → auto-pause + Inbox
- Capability Matrix status board: `canPublish` + `publishMode(api|session)` + `riskLevel`
- Paid Ads spend always HumanGate
- Planner Queue between Decision and Workers
- Decision Graph persisted for explainability
- Learning auto-promote only above Confidence threshold
- Four buses: Command / Query / Domain / System
- ORM: **Drizzle + SQLite** behind Repository (not Prisma)
- UI: Tailwind + shadcn/ui + Pretendard
- Test/Lint: Vitest + Playwright + ESLint + Prettier
- Monorepo: pnpm workspaces + Turborepo
- Ship: electron-builder + electron-updater

## Code hygiene (anti duplication)

| Rule | Detail |
| --- | --- |
| One owner | Each concern has one package home (see `03_ENGINES.md`) |
| No second Decision Engine | Planner/Recommendation/Executive must not emit competing daily rankings |
| No parallel Knowledge gods | Use namespaces, not `GrowthKnowledge` + `CompetitorKnowledge` tables |
| Domain API only from UI | Renderer → IPC → Domain API; UI never touches engines/buses directly |
| Connectors own platforms | Platform logic never leaks into Growth/Content |
| No ToS-hostile core | No captcha bypass / fingerprint spoof / proxy laundering / spam botnet |

## Git rules

- Branch from `main` for features
- Never commit secrets
- Conventional, short commits focused on why
- Do not force-push `main`
- Set `user.name` / `user.email` before first commit (global or local)

## Operate gate

Beginners: read [`04_HOW_TO_OPERATE.md`](04_HOW_TO_OPERATE.md) before approving Phase A work.

## Implementation approval gate

- Docs-only until [`05_IMPL_APPROVAL.md`](05_IMPL_APPROVAL.md) Status is **APPROVED**.
- Do not scaffold Electron / monorepo app code while Status is **AWAITING EXPLICIT APPROVAL**.
- Human approval phrases: `Approve Phase A` / `Approve implementation`.

## Doc size rule

Each `docs/architecture/0x_*.md` stays lean for V1 — roughly **100–300 lines**. Catalog dumps go to `docs/appendix/`.
