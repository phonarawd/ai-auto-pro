# 15 — Desktop UX & Implementation Roadmap

**Status:** Phase 0 RFC
**App:** CLIME AI Growth Studio (Electron + Next.js)
**End deliverable:** `CLIME AI Growth Studio.exe`

---

## 1. End-state UX

```text
CLIME AI Growth Studio.exe
┌──────────────────────────────────────────┐
│ AI Mission Center / Command Center       │
│ 오늘 AI가 준비한 작업                      │
│ [START] [검토] [자동게시*] [내보내기 백업]  │
│ 상태판: Capability · 게시/일시정지 · 진행 · Trace │
└──────────────────────────────────────────┘
* 자동게시 = canPublish + publishMode(api|session); challenge 시 Inbox 일시정지
```

**상태판 (status board)** — not a vanity metrics strip: Capability badges, publish/pause, today’s mission progress, Trace on failure. No follower/impression/“growth %” marketing collage.

09:00 example: Naver check → recent analysis → keywords → blog → IG/Reels/Shorts transform → validate → auto-publish (or pause on challenge).

---

## 2. Information architecture

```text
CLIME AI Growth Studio
├── AI Mission Center          # HOME — today’s mission + START
├── AI Inbox (+ Connector Doctor + challenge pauses)
├── Projects
├── Account Manager
│   ├── Sessions · Matrix · Router · Health · Doctor
│   ├── Account Sandbox
│   ├── Account Dashboard
│   └── Platforms… (Registry + Manifest)
├── Tools / Browser Profiles
├── Content (+ Publishing History)
├── Knowledge Base (namespaced)
├── Mission Templates / Plans
├── Queue / Calendar / Keywords
├── Analytics
└── Export (backup log)
```

### First-run

**AI Connection Wizard** → platform select → connect → profile import → brand draft → tips → Mission Center. Skippable; resumable from Account Manager.

Quick Actions global.

---

## 3. Mission Center & Executive Dashboard

### Mission Center (home)

- Today’s Decision output
- **[START]** → Planner Queue → Worker Runtime runs Growth Workflow → validate → auto-publish per Matrix
- **상태판 / Status board** (never a metrics strip or vanity KPI collage): Capability (`canPublish` / `publishMode` / `riskLevel`), publish/pause state, today’s mission progress, Trace on failure
- Optional compact ops cues (e.g. keyword focus, yesterday outcome) only as status — never a marketing stats strip or card collage
- “Why” via Decision Graph explain
- **Delivery split (locked):** UX shell + Domain API stub contract = **슬라이스 8**; real engines behind START = **Phase B** (Account/Matrix/Inbox/Workflow/Queue/Workers) + Phase C publish ladder

### Executive Dashboard

- Week/Month/Quarter envelopes & ROI goals
- Reallocation recommendations (“ROI +18% → more reels”)
- Does **not** micro-manage daily queue

---

## 4. Desktop shell principles

| Principle | Meaning |
|---|---|
| UI never blocks on AI | Jobs async; progress via Inbox |
| Domain API only | See `04_DOMAIN_API.md` |
| Honest Capability badges | `canPublish` + `publishMode` + `riskLevel` on Account + publish CTAs |
| Auto-publish CTAs | Enabled when Matrix allows; challenge → pause UI + Inbox |
| Export backup | Always available; not the only path |
| Trace-friendly | Show Trace ID on failures |
| UI stack | Tailwind + shadcn/ui + Pretendard |

Shell: Electron main + preload bridge + Next.js renderer.
Ship: **electron-builder + electron-updater** (code-signing aware).

---

## 5. Toolchain gate (before Phase A app code)

Repo: `C:\Users\PC\AI_CONTENT_OS`

```powershell
powershell -ExecutionPolicy Bypass -File scripts\check-toolchain.ps1
```

Must be **GREEN** before Electron native installs / Phase A. Phase 0 RFCs are complete; do not start Electron native installs until MSVC is present.

Package manager: **pnpm only**. Monorepo: **pnpm workspaces + Turborepo**.

Operator guide: `docs/setup/04_HOW_TO_OPERATE.md`.

---

## 6. Roadmap phases

| Phase | Focus |
|---|---|
| **0** | 15 focused RFC docs — **completed** (+ Design Gate `16`) |
| **A** | Design SSOT(`16`) → Storage(Drizzle) → **Feature→Policy→Runtime** → Domain API/buses/obs → Vault/Session/Config → AI Engine (**Cost**) → **CI** → `@clime/ui` → Desktop shell → **Mission Center v1 = 슬라이스 8** (UX shell + Domain API **stub** contract; status board, not metrics strip) |
| **B** | Account + Capability Matrix + Registry + Wizard/Inbox + Workflow + **Planner Queue** + Workers — **실엔진** wire into the slice-8 Mission Center START contract (does not redefine Mission UX) |
| **C** | Content core + **Validate** + Repurpose + Export backup + History + **auto-publish (API/session)** |
| **D** | Growth/research MVP (Trend Source + Normalizer + Keyword Graph **inputs**) + Topic Generator under **`growth/planning`** |
| **E** | Growth/revenue + Growth/decision (**Decision Graph**) → Mission Center |
| **F** | Brand rules + Validate polish + Publishing History + **challenge auto-pause** |
| **G** | Researcher + Competitor/Gap/Opportunity/Viral (under research/) |
| **H** | Growth/planning polish + Scheduler intel + Experiments |
| **I** | Learning (**Confidence**) + Reflection + ROI loop |
| **J** | **Executive + Goal** (Meta slim) + Executive Dashboard + Business Signals |
| **K** | Settings polish + Persona/Emotion **prefs UI** (engine ownership remains `growth/research`) + Knowledge Store UI + **installer / sign / updater** → `.exe` |
| **L+** | Expansion Map #1–15: Workspace/Team Mode, Paid Ads, CRM, Marketplace, AI CEO depth, etc. |

**Phase verification:** each advance uses a check pattern analogous to `check-toolchain.ps1` (CI green + RFC acceptance for that phase).

**Delivery gates:** Approve plan → Phase 0 RFCs (**done**) → Approve implementation → Build → `.exe`.

---

## 7. Locked decisions (desktop-relevant)

| Decision | Choice |
|---|---|
| Stack | Electron + Next.js + TS + Node + Drizzle/SQLite + Zod + Tailwind/shadcn/Pretendard |
| Monorepo | pnpm workspaces + Turborepo |
| Test / Lint | Vitest + Playwright + ESLint + Prettier |
| Ship | electron-builder + electron-updater |
| VCS | GitHub required from Phase 0 |
| Cloud DB | Supabase/Postgres optional later; not V1 |
| Auth UX | Official OAuth/API first; BAE session auto-publish when needed; Export backup |
| Publish | Full-auto ladder: API → session; challenge pause |
| Secrets | Vault / OS keychain |
| Cut from V1 | Full Paid Ads, Landing suite, CRM, Team Mode, remote Marketplace, ToS-hostile bulk automation |

---

## 8. Expansion Map reminder

Phase-L+ items #1–15 are design ports in `01_PRODUCT.md` (also noted in `09`/`14`). Implement only after V1 ROI loop works. Attach via Connector Registry + Domain API + Feature Gate — core engines unchanged. Paid Ads spend always HumanGate.

---

## 9. Risks (UX / delivery)

| Risk | Mitigation |
|---|---|
| Session / challenge fragility | API-first; auto-pause + Inbox |
| Fake firehose expectations | Capability + import honesty |
| Simulator overconfidence | Labeled estimates |
| Module sprawl | Feature Gate + umbrella discipline |
| Unsafe automation pressure | Safety boundary + risk badges |
| Token theft | Vault |

---

## 10. Doc set index

```text
docs/architecture/
  01_PRODUCT.md
  02_CONSTITUTION.md
  03_ENGINES.md
  04_DOMAIN_API.md
  05_WORKFLOW.md
  06_GROWTH.md
  07_AI.md
  08_CONTENT.md
  09_ANALYTICS.md
  10_ACCOUNT.md
  11_MEMORY_KNOWLEDGE.md
  12_INFRASTRUCTURE.md
  13_GOVERNANCE.md
  14_DATABASE.md
  15_DESKTOP_AND_ROADMAP.md   ← this file
  16_DESIGN_SYSTEM.md         ← Visual / UX SSOT (Design Gate)
```

Optional `docs/appendix/` for catalogs — not required for implementation passes.

---

## 11. Implementation approval checklist

Operator SSOT: [`docs/setup/05_IMPL_APPROVAL.md`](../setup/05_IMPL_APPROVAL.md) (Status must be **APPROVED** before app code).

Before Phase A code:

- [x] Phase 0 RFCs reviewed
- [x] `scripts/check-toolchain.ps1` GREEN
- [x] Explicit approval to implement (`05_IMPL_APPROVAL.md` — APPROVED 2026-08-07)
- [x] Git remote (GitHub) configured when ready to collaborate
- [x] Operators read `docs/setup/04_HOW_TO_OPERATE.md`

---

## 12. Cross-references

- Product vision → `01_PRODUCT.md`
- Constitution → `02_CONSTITUTION.md`
- Domain API / Electron → `04_DOMAIN_API.md`
- Account Wizard → `10_ACCOUNT.md`
- Design System (tokens, Mission composition, UX Gate) → `16_DESIGN_SYSTEM.md`
- Setup docs → `docs/setup/*`

---

## 13. Acceptance (Phase 0)

- [x] Mission Center + IA defined (auto-publish CTAs + 상태판 / status board — not metrics strip)
- [x] Mission Center delivery split locked: **슬라이스 8** = UX/stub; **Phase B** = 실엔진 wire-in
- [x] Phases 0–K and L+ listed (A+CI, C+auto-publish, F+challenge pause, K+installer/sign/updater)
- [x] Toolchain gate referenced
- [x] Full-auto publish desktop rules
- [x] Doc set index complete (+ `16` Design Gate)
