# Implementation approval gate — Phase A

Status: APPROVED

Phase 0 (docs / RFCs / toolchain gates) is complete. This repository was **docs-only** while Status was `AWAITING EXPLICIT APPROVAL`. A human has now approved Phase A; agents may implement app code per the roadmap.

Scaffolding of Electron app code, `package.json`, `apps/`, `packages/`, monorepo layout, and CI app workflows is **allowed** under Phase A scope in `15_DESKTOP_AND_ROADMAP.md`.

---

## Pre-approval checklist

| Check | State |
|---|---|
| Phase 0 RFCs (`docs/architecture/` ×15) | Done — review before approving |
| `scripts/check-phase0.ps1` | Must be GREEN |
| `scripts/check-toolchain.ps1` | Must be GREEN |
| Operators read `04_HOW_TO_OPERATE.md` | Required before approve |
| Git remote configured | Optional for local Phase A |
| Explicit approval to implement | **Approved** (2026-08-07) |

Detail checklist also lives in [`15_DESKTOP_AND_ROADMAP.md`](../architecture/15_DESKTOP_AND_ROADMAP.md) §11.

---

## How to approve (human only)

Reply in Cursor with one of these phrases (or clear equivalent):

- `Approve Phase A`
- `Approve implementation`
- `Phase A 승인`

After approval, agents may start Phase A per `15_DESKTOP_AND_ROADMAP.md`: infra, Feature→Policy→Runtime, Domain API, AI Engine, and CI (lint/typecheck/test). Update this file’s **Status** line to `APPROVED` and date the approval in a short note below.

### Approval log

| When | By | Phrase / note |
|---|---|---|
| 2026-08-07 | Human (Cursor) | `Phase A 승인` — Status set to APPROVED. Gates: check-phase0 GREEN, check-toolchain GREEN (1 warn: cl.exe not on PATH). |

---

## Hard stop (agents)

While Status was `AWAITING EXPLICIT APPROVAL` (docs-only hold):

1. Do not scaffold Electron / Next.js / pnpm workspace app code.
2. Do not add `package.json` for the product monorepo.
3. Docs, setup notes, and gate scripts only — no app implementation “head start.”
4. If asked to implement app code without approval, refuse and point here.

**Current Status is `APPROVED`.** The docs-only hard stop no longer applies. Prefer narrow slices (operate guide §3); do not skip Validate / Capability Matrix / constitutional locks.

---

## Verify docs-only hold

```powershell
cd C:\Users\PC\AI_CONTENT_OS
powershell -ExecutionPolicy Bypass -File scripts\check-phase0.ps1
powershell -ExecutionPolicy Bypass -File scripts\check-toolchain.ps1
```

Expect Phase 0 **GREEN**. After Phase A scaffolding, `package.json` / `apps/` / `packages/` are expected; keep lint/typecheck/test wired.
