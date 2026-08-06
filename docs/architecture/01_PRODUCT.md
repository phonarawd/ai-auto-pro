# 01 — Product: CLIME AI Growth Operating System

**Status:** Phase 0 RFC (normative for V1 scope)  
**App brand:** CLIME AI Growth Studio (`.exe`)  
**Docs brand:** CLIME AI Growth Operating System  
**Repo:** `C:\Users\PC\AI_CONTENT_OS`

---

## 1. Positioning

| Mislabel | Accurate label |
|---|---|
| SNS 자동화 / 자동 포스팅 툴 | **Wrong as product name** — posting is one optional step |
| 자동 홍보 프로그램 | **Partial** — distribution slice only |
| **Correct** | **Growth Operating System / Growth Business AI** for CLIME |

**Team roles the OS replaces (AI-operated):** Marketing · Content · Ads-strategy · Analytics · Strategy — not a “scheduler bot.”

Comparable *ambition* (not feature parity): Buffer/Hootsuite/Later + SEMrush/Ahrefs-like research + HubSpot-like growth ops + Jasper-like generation — **unified in one local desktop app**. V1 does **not** claim full HubSpot/Ads Manager parity.

---

## 2. Product identity

| Field | Value |
|---|---|
| Path | `C:\Users\PC\AI_CONTENT_OS` |
| System | CLIME AI Growth Operating System |
| App name | CLIME AI Growth Studio |
| Purpose | Growth Business AI for CLIME — promo spine + ROI/allocation decisions |
| Operator model | Autonomous prep + human review/approve |
| Accounts | Account Engine + Capability Matrix |
| Publish | Export default; live post only if `canPublish` |

**Hard limit:** No universal auto-login + auto-post. Capabilities differ per platform.

**Architecture limit:** Do **not** promote every intelligence feature to a top-level Engine.

---

## 3. Canonical end-to-end loop

```text
Market research (Naver/Google/YT/IG/TikTok/Threads/Reddit/communities…)
  → Trend / competitor / keyword
  → Profitability (Revenue Prioritizer)
  → Decide what to make + which channel mix (Decision Engine)
  → Produce (blog/reels/shorts/tiktok/threads + thumb/title/hashtag/SEO)
  → Channel transform
  → Human review
  → Export and/or API publish (canPublish only)
  → Measure views/CTR/signups/investments
  → ROI analysis
  → Auto strategy revision (Executive + Learning + Reflection)
```

### Normative decision examples

- Reels signup CVR 3× blog → cut blogs, +15 reels this week
- “AI부업” competition spike → shift to “ChatGPT 자동화”
- High search “주식” can lose to “AI부업” on CLIME expected signup/invest

---

## 4. Product heart — Agent Loop (V1)

```text
Observe → Research → Analyze → Predict
  → Plan (Executive week/month/quarter → Decision daily → Planner Queue)
  → Generate → Validate → Optimize → Publish/Export
  → Measure → Learn → Reflect → Policy Update → Repeat
```

### Decide-money path (no duplicate strategists)

```text
Trend + Market + Product/Price/Ad signals
  → Keyword Graph → Topic → Revenue Estimation
  → Revenue Prioritizer → Decision Engine (daily)
  → Validate → Production → Distribute → ROI Measure
  → Learn / Reflect → Executive horizon reallocation
```

---

## 5. V1 vs Phase-L+ Expansion Map

**V1 ships:** organic Growth OS spine — research → profitability decide → produce → review → Export/(API post if `canPublish`) → signup/invest/ROI → learn/reflect/reallocate (format/keyword mix). Product/Price/Ad are **signals**, not full ads consoles.

**Phase-L+ Expansion Map** (design ports in RFCs; implement only after V1 ROI loop works). Each item is a **module/connector**, not a new top-level Domain Engine:

| # | Expansion | Homes under | Capability rule |
|---|---|---|---|
| 1 | **Paid Ads OS** — Google/Meta/TikTok/Naver/Kakao Ads: create→budget→test→CPA/ROAS→pause→recreate | Account connectors + Meta/Executive + Decision + Experiment | Official Ads APIs only |
| 2 | **Landing Page AI** — diagnose low CVR→new landing→A/B→winner | Content + Experiment + Analytics | Export/hosting connector |
| 3 | **CRM Growth Engine** — signup→nudge (push/email/Kakao)→revisit→invest→retention | Automation + Notification + future CRM connector | Provider APIs / user consent |
| 4 | **SEO Intelligence depth** — rank track, competitor SERP, backlinks, internal links, clusters, topical authority | GIL/Content SEO module expansion | Search APIs / imports |
| 5 | **Ads Creative AI** — low CTR→swap thumb/title/CTA→re-upload | Content + Paid Ads OS + Experiment | Ads API `canPublish` |
| 6 | **Social Listening** — community/SNS/comments/news → sentiment → opportunity | GIL Market/Trend + Researcher | Capability-gated ingest |
| 7 | **Competitor Spy+** — ads+landing+reels+shorts+YT change detection | Competitor Watch expansion | Public/API/import only |
| 8 | **Revenue Forecast** (ops UI) — e.g. 25 reels → est. signups/invest/revenue | Analytics Simulator + Revenue Intelligence | Labeled estimates |
| 9 | **AI CEO** — Executive AI++ reallocates organic+paid | Meta Executive AI | Constrains Decision/Planner/Ads |
| 10 | **Auto Experiment Engine** — multivariate title/thumb/CTA/landing arms → pick winners | Analytics Experiment (scale-up of V1 A/B) | Always HumanGate on spend |
| 11 | **Knowledge Evolution 2.0** — success→pattern→rule→**cross-project** apply | Knowledge Evolution + Memory/Learning | Opt-in per project |
| 12 | **Team Mode** — Admin/Marketer/Designer/Approver | Infra identity (cut from V1) | Local multi-profile first |
| 13 | **Plugin Marketplace** — install connectors/tools | Plugin SDK (local registry→remote later) | Signed/trusted packages |
| 14 | **AI Financial Dashboard** — ad spend, signup, invest, LTV, CAC, ROAS, ROI, net profit | Analytics + Revenue + Paid Ads | Manual+API imports |
| 15 | **Autonomous Growth Loop (full)** — market→product→price→ads→…→policy→next strategy | Agent Loop end-state | Every external side effect Capability-gated |

**Invariant (never relax):** Capability Matrix · official API preferred · Export default · session≠publish · no ToS-hostile automation in core.

Phase-L+ attaches via **Connector Registry + Domain API + Feature Gate** — core engines unchanged.

---

## 6. End-state UX (what the .exe feels like)

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

Typical morning: Naver check → recent posts analysis → keywords → blog → IG/Reels/Shorts transform → review queue → “검토만 하면 됩니다.”

Browser profiles (Chrome P1→Naver, P2→IG, P3→Threads): BAE launches profile for **approved assist reads**; not universal publish.

---

## 7. Recommended information architecture

```text
CLIME AI Growth Studio
├── AI Mission Center          # HOME — today’s mission + START
├── AI Inbox (+ Connector Doctor)
├── Projects
├── Account Manager
│   ├── Sessions · Matrix · Router · Health · Doctor
│   ├── Account Sandbox (connector tests)
│   ├── Account Dashboard
│   └── Platforms… (Registry + Manifest)
├── Tools / Browser Profiles
├── Content (+ Publishing History)
├── Knowledge Base (namespaced store UI)
├── Mission Templates / Plans
├── Queue / Calendar / Keywords
├── Analytics
└── Export
```

First-run: **AI Connection Wizard** (skippable; resumable from Account Manager). Quick Actions global.

---

## 8. Stack (locked)

| Foundation | V1 decision |
|---|---|
| Desktop | Electron + Next.js + TypeScript + Node |
| DB | SQLite via Repository (Prisma); Postgres/Supabase later without engine rewrites |
| Secrets | OS keychain / encrypted Vault — never commit keys |
| VCS | GitHub required from Phase 0 |
| Package manager | pnpm only |
| MCP | FS, SQLite, Browser (assist when allowed) |

---

## 9. Delivery gates

```text
Approve plan → Phase 0 RFCs (+ init git at AI_CONTENT_OS)
  → Approve implementation → Build → CLIME AI Growth Studio.exe
```

| Artifact | Is | Is not |
|---|---|---|
| Plan + `docs/architecture/*` | Design for sequential Cursor implementation | A finished `.exe` |
| Later implementation | Electron desktop app | Instant from markdown |
| End deliverable | `CLIME AI Growth Studio.exe` | Universal auto-post / 17 top-level engines |

---

## 10. Must-keep pillars

Growth OS · V1 slim (Growth 5 umbrellas; Executive long-horizon; Meta=Executive+Goal; Knowledge Store; Feature→Policy→Runtime; lean Registry; Global/Project/User) · Validate in Agent Loop · Planner Queue · Decision Graph · Confidence · 4 buses · 15 focused docs · L+ Expansion Map · Export-first

---

## 11. Cut from V1 (explicit)

Full Paid Ads OS, Landing A/B suite, CRM/Email/Push, rank/backlink depth, Team Mode, Plugin Marketplace remote, fake universal auto-post, Workspace settings tier.

---

## 12. Risks (product)

| Risk | Mitigation |
|---|---|
| Browser-session fragility | API-first; session assist opt-in |
| Fake “full internet firehose” expectations | Capability + import honesty |
| Simulator/prediction overconfidence | Version assumptions; label estimates |
| Universal auto-post expectations | Matrix badges in UI |
| Module sprawl | Engine boundaries + Feature Gate |

---

## 13. Cross-references

- Constitution / invariants → `02_CONSTITUTION.md`
- Engines map → `03_ENGINES.md`
- UX + phases → `15_DESKTOP_AND_ROADMAP.md`
- Expansion ports also noted in `09_ANALYTICS.md`, `14_DATABASE.md`

---

## 14. Acceptance (Phase 0)

- [x] Product named as Growth OS, not posting tool
- [x] V1 loop and Agent Loop documented
- [x] Expansion Map #1–15 listed with homes
- [x] Export-first / Capability publish rule stated
- [x] Stack and delivery gates locked
