# B1 Account Prove (GREEN)

**Status:** GREEN — plan to-do `b1-d` (GROK4.5/256K)  
**Date:** 2026-08-07  
**SSOT parents:** [`10_ACCOUNT.md`](../architecture/10_ACCOUNT.md), [`02_CONSTITUTION.md`](../architecture/02_CONSTITUTION.md), [`B1A_ACCOUNT_CONTRACT.md`](B1A_ACCOUNT_CONTRACT.md)  
**Packages:** `@clime/plugin-sdk`, `@clime/connector-registry`, `@clime/account` (+ desktop host wiring)

---

## 1. Constitutional Locks & Audit Checklist

| # | Gate Item | Status | Verification |
|---|---|---|---|
| 1 | **Plugin Contract First** (Manifest only, zero core → module internals) | **PASS** | `plugin-sdk` exposes `ConnectorManifestSchema` & `IPlatformConnector`. Registry/account load connectors via Manifests only. `boundary.test.ts` forbids `plugins/*`, Playwright, Puppeteer imports. |
| 2 | **Auth Ladder P0 → P2** | **PASS** | Default Manifests declare `oauth` (P0), `session` (P1), and/or `manual` (P2 Export backup) per platform. |
| 3 | **Honest Capability Matrix** | **PASS** | `CapabilityMatrixService.computeMatrix` uses Manifest ∩ health. Fields: `canPublish`, `publishMode`, `riskLevel`. Copy *"이 플랫폼은 여기까지 가능합니다."* Disconnected → `canPublish: false` (no always-true stub on wired host). |
| 4 | **Anti-Abuse & Challenge Auto-Pause** | **PASS** | `ConnectorDoctor` + `setHealthState(challenge)` emit `PublishChallengeDetected` & `PublishAutoPaused`; Matrix forces `canPublish = false`; no bypass path. |
| 5 | **Account Router & Multi-Account** | **PASS** | `AccountRouter` routes `이벤트` / `브랜드` campaign tags to sub vs primary accounts. |
| 6 | **Account Sandbox & Doctor** | **PASS** | `AccountSandbox` runs declared capability diagnostics only (no live posts). Doctor maps errors → remediation. |
| 7 | **Domain API & IPC Wiring** | **PASS** | `createAccountDomainHandlers` overrides stubs in `bootstrapDesktopDomainApi` → `createDomainHost({ handlers })`. Channel `domain:account.*`. |
| 8 | **Lean plugin-sdk boundary** | **PASS** | `plugin-sdk` deps = `@clime/shared` + `zod` only. No account/registry/storage/BAE cycle. |
| 9 | **코어 → 모듈 내부 import 0** | **PASS** | Source grep + `packages/account/src/boundary.test.ts` GREEN. |

---

## 2. Test Verification Summary

| Package | Tests |
|---|---|
| `@clime/plugin-sdk` | `manifest.test.ts` — 2 PASS |
| `@clime/connector-registry` | `registry.test.ts` — 3 PASS |
| `@clime/account` | `account.test.ts` (6) + `boundary.test.ts` (2) — 8 PASS |
| `@clime/desktop` | `desktop-domain-api.test.ts` includes honest Matrix wiring — suite PASS |

Full monorepo: `pnpm run ci:quality` (lint + typecheck + test, 15 packages) → **GREEN**.

---

## 3. Changed paths (B1 handoff)

- `docs/appendix/B1A_ACCOUNT_CONTRACT.md` — lean DAG + `getMatrix` semantics (§6–8)
- `packages/plugin-sdk/**` — Manifest Zod + `IPlatformConnector`
- `packages/connector-registry/**` — Manifest registry + default connectors
- `packages/account/**` — Matrix / Router / Doctor / Sandbox / AccountAPI + lean deps
- `apps/desktop/src/main/bootstrap-domain-api.ts` — wires Account handlers
- `apps/desktop/src/renderer/components/MissionCenterFrame.tsx` — honest Matrix apply (no `?? true`)
- `docs/appendix/B1D_ACCOUNT_PROVE.md` — this prove

**Contract compliance:** Prisma 0 · captcha bypass 0 · fake always-true Matrix on wired host 0 · Queue not in scope (B3).

---

## 4. Slice B1 Acceptance Sign-Off

| Part | Model | Status |
|---|---|---|
| `b1-a` CONTRACT | GROK4.5 | **DONE** — B1A FROZEN |
| `b1-b` IMPLEMENT packages | COMPOSER2.5 | **DONE** |
| `b1-c` Matrix + ops skeleton wire | COMPOSER2.5 | **DONE** |
| `b1-d` PROVE | GROK4.5 | **GREEN** |

**Next to-do:** `b2-a` — COMPOSER2.5 — Wizard + Inbox (`packages/notification`)
