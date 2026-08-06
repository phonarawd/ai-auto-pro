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
│ ✔ 네이버 글 2 · 릴스 3 · 쇼츠 5 · 키워드    │
│ [검토] [내보내기] [게시*]                  │
└──────────────────────────────────────────┘
* 게시 = capability 허용 시에만
```

09:00 example: Naver check → recent analysis → keywords → blog → IG/Reels/Shorts transform → review → “검토만 하면 됩니다.”

---

## 2. Information architecture

```text
CLIME AI Growth Studio
├── AI Mission Center          # HOME — today’s mission + START
├── AI Inbox (+ Connector Doctor)
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
└── Export
```

### First-run

**AI Connection Wizard** → platform select → connect → profile import → brand draft → tips → Mission Center. Skippable; resumable from Account Manager.

Quick Actions global.

---

## 3. Mission Center & Executive Dashboard

### Mission Center (home)

- Today’s Decision output  
- **[START]** → Worker Runtime runs Growth Workflow → awaiting approval  
- Metrics strip: keywords, exports pending, yesterday performance  
- “Why” via Decision Graph explain  

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
| Honest Capability badges | Matrix visible on Account + publish CTAs |
| Export default | Publish button disabled/hidden without `canPublish` |
| Trace-friendly | Show Trace ID on failures |

Stack: Electron main + preload bridge + Next.js renderer.

---

## 5. Toolchain gate (before Phase A app code)

Repo: `C:\Users\PC\AI_CONTENT_OS`

```powershell
powershell -ExecutionPolicy Bypass -File scripts\check-toolchain.ps1
```

Must be **GREEN** before Electron native installs / Phase A. Phase 0 RFCs may proceed once Build Tools install completes; do not start Electron native installs until MSVC is present.

Package manager: **pnpm only**.

---

## 6. Roadmap phases

| Phase | Focus |
|---|---|
| **0** | 15 focused RFC docs only (+ git init) |
| **A** | Infra + **Feature→Policy→Runtime** core (lean Registry + Manifest) + Domain API + AI Engine (**Cost** + model policies) |
| **B** | Account + Capability Matrix + Mission Center + Workflow + **Planner Queue** + Workers |
| **C** | Content core + **Validate** + Repurpose + Export + History |
| **D** | Growth/research MVP (Trend Source + Normalizer + Keyword Graph + Topic) |
| **E** | Growth/revenue + Growth/decision (**Decision Graph**) → Mission Center |
| **F** | Brand rules + Validate polish + Publishing History |
| **G** | Researcher + Competitor/Gap/Opportunity/Viral (under research/) |
| **H** | Growth/planning + Scheduler intel + Experiments |
| **I** | Learning (**Confidence**) + Reflection + ROI loop |
| **J** | **Executive + Goal** (Meta slim) + Executive Dashboard + Business Signals |
| **K** | Global/Project/User settings polish + Persona/Emotion + Knowledge Store UI + `.exe` |
| **L+** | Expansion Map #1–15: Workspace/Team Mode, Paid Ads, CRM, Marketplace, AI CEO depth, etc. |

**Delivery gates:** Approve plan → Phase 0 RFCs → Approve implementation → Build → `.exe`.

---

## 7. Locked decisions (desktop-relevant)

| Decision | Choice |
|---|---|
| Stack | Electron + Next.js + TS + Node + SQLite + Prisma + local files |
| VCS | GitHub required from Phase 0 |
| Cloud DB | Supabase/Postgres optional later; not V1 |
| Auth UX | Official OAuth/API first; optional browser-session assist; Export fallback |
| V1 distribution | Export packs + account-aware artifacts |
| Live post | Official API + `canPublish` only |
| Secrets | Vault / OS keychain |
| Cut from V1 | Full Paid Ads, Landing suite, CRM, Team Mode, remote Marketplace, fake universal auto-post |

---

## 8. Expansion Map reminder

Phase-L+ items #1–15 are design ports in `01_PRODUCT.md` (also noted in `09`/`14`). Implement only after V1 ROI loop works. Attach via Connector Registry + Domain API + Feature Gate — core engines unchanged.

---

## 9. Risks (UX / delivery)

| Risk | Mitigation |
|---|---|
| Browser-session fragility | API-first; assist opt-in |
| Fake firehose expectations | Capability + import honesty |
| Simulator overconfidence | Labeled estimates |
| Module sprawl | Feature Gate + umbrella discipline |
| Universal auto-post expectations | Matrix badges |
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
```

Optional `docs/appendix/` for catalogs — not required for implementation passes.

---

## 11. Implementation approval checklist

Before Phase A code:

- [ ] Phase 0 RFCs reviewed  
- [ ] `scripts/check-toolchain.ps1` GREEN  
- [ ] Explicit approval to implement  
- [ ] Git remote (GitHub) configured when ready to collaborate  

---

## 12. Cross-references

- Product vision → `01_PRODUCT.md`
- Constitution → `02_CONSTITUTION.md`
- Domain API / Electron → `04_DOMAIN_API.md`
- Account Wizard → `10_ACCOUNT.md`
- Setup docs → `docs/setup/*`

---

## 13. Acceptance (Phase 0)

- [x] Mission Center + IA defined
- [x] Phases 0–K and L+ listed
- [x] Toolchain gate referenced
- [x] Export-first desktop rules
- [x] Doc set index complete
