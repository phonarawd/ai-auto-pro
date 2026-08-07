# B2 Inbox / Wizard Prove (GREEN)

**Status:** GREEN — plan to-do `b2-c` (GROK4.5/256K)  
**Date:** 2026-08-07  
**SSOT parents:** [`12_INFRASTRUCTURE.md`](../architecture/12_INFRASTRUCTURE.md) §7, [`04_DOMAIN_API.md`](../architecture/04_DOMAIN_API.md) §7, [`S3A_DOMAIN_API_CONTRACT.md`](S3A_DOMAIN_API_CONTRACT.md) §5.13 / §6.3, [`10_ACCOUNT.md`](../architecture/10_ACCOUNT.md) §11, [`16_DESIGN_SYSTEM.md`](../architecture/16_DESIGN_SYSTEM.md) UX Gate  
**Packages:** `@clime/notification` + desktop Inbox/Wizard/Quick Actions wiring

---

## 1. Acceptance checklist

| # | Gate Item | Status | Verification |
|---|---|---|---|
| 1 | **`packages/notification` Inbox** (toast→Inbox; progress/job path) | **PASS** | `NotificationManager` + Domain handlers; `PlannerItemEnqueued` / challenge System events → Inbox; push channel `domain:notification.push` |
| 2 | **침묵실패 0** | **PASS** | `account.pausePublish` → System `PublishChallengeDetected` → Inbox `PAUSED_CHALLENGE` with `traceId` |
| 3 | **challenge → pause + Inbox** | **PASS** | Matrix `canPublish:false` + Inbox item + `ChallengePauseBanner`; Mission status `PAUSED_CHALLENGE` |
| 4 | **우회 CTA 0** | **PASS** | Forbidden bypass labels rejected at enqueue; renderer grep; banner `data-bypass-cta="0"` |
| 5 | **Wizard 스킵 / 재개** | **PASS** | `account.wizardProgress` skip (`completed:true`) + resume (`step` restore); UI 건너뛰기 / 나중에 이어서 |
| 6 | **Quick Actions** | **PASS** | `@clime/ui` `CommandPalette` (title Quick Actions); Ctrl/⌘K; Domain API only |
| 7 | **Renderer bus subscribe 0** | **PASS** | Preload `notification.subscribePush` on allowlisted push only; renderer ↛ `@clime/event-bus` |
| 8 | **UX Gate** | **PASS** | Brand + CTA + Status board; Export=backup; no vanity stats; Pretendard / `--clime-*` |

---

## 2. Test verification

| Package | Tests |
|---|---|
| `@clime/notification` | `notification.test.ts` + `boundary.test.ts` |
| `@clime/desktop` | `prove.b2c.test.tsx` + updated `desktop-domain-api.test.ts` |

`pnpm lint` · `pnpm typecheck` · `pnpm test` → **GREEN** (monorepo).

---

## 3. Changed paths (B2 handoff)

- `packages/notification/**` — Inbox manager, bus forwarder, NotificationAPI handlers
- `packages/event-bus/src/known-types.ts` — `PublishAutoPaused`
- `packages/account/src/manager.ts` — stored `eventBus` for challenge emit
- `packages/domain-api` — `subscribePush` + `NOTIFICATION_PUSH_CHANNEL` on preload client; `InboxItemView`
- `apps/desktop/src/main/bootstrap-domain-api.ts` — Account + Notification + START→Queue event→Inbox
- `apps/desktop/src/renderer/components/{AiInbox,AiConnectionWizard,ChallengePauseBanner,MissionCenterFrame}.tsx`
- `docs/appendix/B2C_INBOX_WIZARD_PROVE.md` — this prove

**Contract compliance:** Prisma 0 · captcha bypass CTA 0 · UI bus subscribe 0 · Export backup wording preserved.

---

## 4. Slice B2 Acceptance Sign-Off

| Part | Model | Status |
|---|---|---|
| `b2-a` IMPLEMENT notification | COMPOSER2.5 | **DONE** |
| `b2-b` IMPLEMENT Wizard + challenge UI + Quick Actions | COMPOSER2.5 | **DONE** |
| `b2-c` PROVE | GROK4.5 | **GREEN** |

**Next to-do:** `b3-a` — GROK4.5 — Workflow + Planner Queue contract
