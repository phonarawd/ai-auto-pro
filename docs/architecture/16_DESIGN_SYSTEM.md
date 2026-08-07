# 16 — Design System (Visual / UX SSOT)

**Status:** Phase A Design Gate (normative for UI; Phase 0 doc set extended)
**App brand:** CLIME AI Growth Studio
**Consumers:** `@clime/ui` (slice 6), Desktop shell (slice 7), Mission Center (slice 8), all V1 surfaces
**Rule:** App UI implements this SSOT. Arbitrary hex, off-token density, and non-whitelist primitives are **blockers**.

---

## 1. Purpose

CLIME is a **Growth Command Center**, not an SNS auto-poster and not a marketing landing page. Visual and interaction language must feel like Linear density + Raycast command speed + Stripe Ops / Bloomberg-lite honesty — with **CLIME brand** as the first-viewport hero of Mission Center.

This document is the single source of truth for:

1. Visual direction and CSS tokens (`--clime-*`)
2. Typography (Pretendard)
3. Density
4. Motion budget
5. Primitive whitelist
6. Mission Center composition
7. UX Acceptance Gate (every major surface before ship)

**Out of scope here:** Domain API contracts (`04`), Capability field semantics (`10`), desktop IA phases (`15`). Those RFCs own meaning; this RFC owns look, feel, and UX gate.

---

## 2. Visual direction

### 2.1 Personality

| Axis | Choice |
|---|---|
| Mood | Cool neutral **ops** — slate / ink surfaces, calm contrast |
| Accent | **One** accent (operational teal-ink or steel blue) — never a rainbow |
| Theme default | **Light** (dark mode = L+; do not ship purple dark SaaS as V1 default) |
| Brand signal | Wordmark / product name is hero-level on Mission Center; no eyebrow-only branding |
| Metaphor | Command center / desk ops — not social feed, not promo collage |

### 2.2 Forbidden looks (reject in review)

- Purple-on-white / purple→indigo gradient SaaS cliché
- Glow / neon / glassmorphism stacks as primary chrome
- Warm cream canvas (#F4F1EA-class) + high-contrast serif display + terracotta accent
- Broadsheet / dense newspaper columns with hairline rules as the app shell
- Floating promo chips, stickers, or badges on hero media
- Vanity KPI card collage / marketing stats strip on the home viewport
- Emoji as structural UI chrome

### 2.3 Token namespace

All color, radius, space, and type tokens use the prefix **`--clime-*`**.

Raw hex in feature screens is forbidden except inside the token definition layer (`@clime/ui` theme). Screens consume tokens / Tailwind theme mapped to tokens only.

### 2.4 Core color roles (semantic)

| Token role | Intent |
|---|---|
| `--clime-bg` | App canvas (cool light neutral) |
| `--clime-bg-elevated` | Panels / toolbars slightly above canvas |
| `--clime-fg` | Primary ink (near-black slate) |
| `--clime-fg-muted` | Secondary labels, meta |
| `--clime-border` | Hairline structural borders (ops, not decorative cards) |
| `--clime-accent` | Single accent — primary CTA, focus ring |
| `--clime-accent-fg` | Text on accent |
| `--clime-success` | Connected / posted_api / healthy |
| `--clime-warning` | Elevated `riskLevel`, session path caution |
| `--clime-danger` | Failed / blocked / challenge pause |
| `--clime-info` | Trace / informational Inbox |

Capability honesty uses Badge variants bound to `canPublish` / `publishMode` / `riskLevel` — never invent a fourth Matrix field in UI.

### 2.5 Surfaces

- Default chrome = **flat ops panels** with quiet borders — not card grids.
- Elevation is rare (dialogs, command palette, Inbox toast → Inbox).
- Status board rows use DataRow / Panel, not marketing Card stacks.

---

## 3. Typography

### 3.1 Family

| Role | Family | Notes |
|---|---|---|
| UI / body / display | **Pretendard** | Locked stack (`01`, `15`) |
| Mono | Pretendard-compatible mono or system mono mapped as `--clime-font-mono` | Trace IDs, jobIds, JSON snippets |

Do **not** introduce Inter / Roboto / Arial as brand defaults. Do **not** pair cream canvas with a decorative serif display.

### 3.2 Scale (desktop-first)

| Token | Use | Approx |
|---|---|---|
| `--clime-text-display` | Mission Center brand / screen title | 28–32 / semibold |
| `--clime-text-title` | Section one-job headline | 18–20 / semibold |
| `--clime-text-body` | Primary reading | 14 / regular |
| `--clime-text-ui` | Toolbar, buttons, DataRow | 13 / medium |
| `--clime-text-caption` | Meta, Trace ID label | 12 / regular |
| `--clime-text-mono` | IDs, codes | 12–13 / mono |

Line length for explanatory copy stays short (one supporting sentence under a headline). Dense tables/queues use `--clime-text-ui`.

### 3.3 Brand test (Mission Center)

If the first viewport could belong to another product after removing the nav chrome, branding is too weak. Product name **CLIME AI Growth Studio** must read as a hero-level signal — not only a sidebar label.

---

## 4. Density

| Rule | Meaning |
|---|---|
| Desktop-first compact | Target 1280×800+; comfortable at 1440×900 |
| One job per section | One headline + one short support line |
| Toolbar > card chrome | Prefer Toolbar + Panel + DataRow |
| Touch not primary | Mouse/keyboard first; hit targets still ≥ 28px |
| Spacing scale | 4-based: `--clime-space-1`…`8` (4→32px). Prefer 8/12/16 between ops rows |
| No dashboard collage | Home is Mission Center composition (§7), not a widget wall |

Compact does **not** mean cramped: use quiet whitespace between the five Mission zones; do not fill gaps with vanity stats.

---

## 5. Motion

Ship **only** these intentional motions (2–3 families). No decorative ambient loops.

| Motion | When | Feel |
|---|---|---|
| **Enter** | Screen / panel mount (Mission Center, Inbox drawer) | 150–200ms ease-out opacity + 4–8px translateY |
| **CTA press** | Primary/secondary buttons | 80–120ms scale/opacity press; no bounce spam |
| **Inbox arrive** | New Inbox item / challenge pause notification | Brief highlight pulse or slide-in row (≤200ms) |

**Forbidden motion:** parallax hero, continuous glow, confetti on publish, skeleton shimmer as permanent chrome, staggered card cascades on home.

Long AI/publish work never waits on animation — return `jobId` immediately; progress via Inbox (`04`, `15`).

---

## 6. Primitives whitelist

`@clime/ui` may ship **only** these interaction primitives for V1 (plus layout tokens). New primitives require an update to this RFC first.

| Primitive | Role |
|---|---|
| `Button` | Primary / secondary / danger / ghost — START, 검토, 자동게시, 내보내기 백업 |
| `IconButton` | Compact toolbar actions |
| `Badge` | Capability honesty (`canPublish`, `publishMode`, `riskLevel`) + status chips |
| `Toolbar` | Screen action strip |
| `Panel` | Ops surface container (not a marketing card) |
| `DataRow` | Status board / queue / matrix rows |
| `Toast` | Transient → must deep-link or hand off to **Inbox** (never silent dismiss of challenge) |
| `CommandPalette` | Global Quick Actions (Raycast-like) |

### 6.1 Card policy

**Card is not a default layout unit.** Cards are allowed **only** as the container for a user interaction (e.g. selectable plan tile, confirm dialog body). If removing border/shadow/radius does not hurt interaction or understanding, it must not be a Card.

**Never** use Cards in the Mission Center hero / first viewport.

### 6.2 Compose from whitelist

Account Matrix, Publishing History, Queue, Settings — compose Toolbar + Panel + DataRow + Badge + Button. Do not invent `StatCard`, `PromoChip`, `HeroOverlay`, or `MetricStrip` components.

### 6.3 Implementation note (later slices)

- Slice 6 (`@clime/ui`): tokens + whitelist only; Story/smoke recommended.
- Slice 7–8: shell + Mission Center consume `@clime/ui` only; renderer ↛ engines/ORM/buses.

---

## 7. Mission Center composition

Home surface. Normative IA also lives in `01_PRODUCT.md` and `15_DESKTOP_AND_ROADMAP.md`; this section freezes **layout zones, CTA priority, and status-board vs vanity** rules for implementers.

### 7.1 First viewport (one composition)

```text
┌─ Mission Center ─────────────────────────────────────┐
│ [Brand: CLIME AI Growth Studio]                       │  Zone A — Brand
│ 오늘 미션 한 줄 (Decision “what/why” summary)          │  Zone B — Mission line
│ [START] [검토] [자동게시] [내보내기 백업]              │  Zone C — CTA group
│ 상태판: Capability · 게시/일시정지 · 진행 · Trace     │  Zone D — Status board
└──────────────────────────────────────────────────────┘
```

Optional Zone E (below fold or secondary column): Decision Graph “Why”, compact ops cues (keyword focus, yesterday outcome) — **status language only**, never a marketing stats strip.

### 7.2 Zone rules

| Zone | Must | Must not |
|---|---|---|
| A Brand | Hero-level product name | Eyebrow-only / logo mark without name |
| B Mission | One line from Decision daily output | Multi-paragraph strategy essay |
| C CTA | Four actions in priority order below | Hidden auto-publish when Matrix allows; Export as sole success path |
| D Status | Capability + publish/pause + mission progress + Trace on failure | Vanity KPI cards, promo chips, floating badges on hero |
| E Why (optional) | Decision Graph explain via Domain API | Competing CTA clusters |

### 7.3 CTA priority (left → right / primary → quaternary)

1. **`[START]`** — enqueues via **Planner Queue** (never bypass). Returns `jobId` immediately.
2. **`[검토]`** — review generated/validated content before or alongside publish path.
3. **`[자동게시]`** — enabled only when Matrix allows; truth from `canPublish` + `publishMode(api|session)` + `riskLevel`. Challenge → auto-pause UI + Inbox (no bypass CTA).
4. **`[내보내기 백업]`** — always available; labeled as **backup log**, never the only success path.

Normal path to a publish decision: **≤ 3 clicks**.

### 7.4 Status board vs vanity statistics

| Allowed (status board) | Forbidden (vanity) |
|---|---|
| `canPublish` / `publishMode` / `riskLevel` badges | Follower / impression / “growth %” marketing cards |
| Publish / pause / `PAUSED_CHALLENGE` state | Fake “전부 자동” success banners |
| Today’s mission progress (workflow/task SM) | Multi-stat collage in first viewport |
| Trace ID on failure | Hero overlays, promo stickers, emoji KPI strips |

Copy for limited platforms (from `10`): **“이 플랫폼은 여기까지 가능합니다.”**

### 7.5 Runtime contracts (UX)

- UI → IPC → Domain API only (`04`).
- AI / publish work: no UI-thread await of full completion; Inbox/progress.
- START → Planner Queue → Worker (Acceptance Gate #10 below; real queue in Phase B3).
- Paid Ads spend controls (if shown): **HumanGate** only.

---

## 8. Copy rules (product surfaces)

| Topic | Rule |
|---|---|
| Product name | **CLIME AI Growth Studio** |
| Capability | **“이 플랫폼은 여기까지 가능합니다.”** |
| Auto-publish unavailable | Explain **why** via Matrix — do not hide |
| Estimates / simulations | Label **“추정”** |
| Export | Always “백업” / backup log |
| Forbidden claims | “모든 SNS 완전 자동”; captcha/bypass implications |

---

## 9. UX Acceptance Gate

Every major V1 surface (Mission Center first; then IA list in `15`) must pass before ship. Reviewers check all boxes:

- [ ] First viewport = brand + core CTA group + status board only (no vanity stats collage)
- [ ] AI calls do not block the UI thread (Inbox/progress; immediate `jobId`)
- [ ] Capability badges are honest (`canPublish` / `publishMode` / `riskLevel`)
- [ ] challenge → auto-pause UI + Inbox (no bypass CTA)
- [ ] Export exposed only as backup
- [ ] Paid Ads spend slot = HumanGate only (or not shown)
- [ ] Failures expose Trace ID
- [ ] Imports outside Domain API path = 0
- [ ] Pretendard + `--clime-*` tokens only (no arbitrary hex sprawl in screens)
- [ ] START does not bypass Planner Queue (after real engine wiring)

### 9.1 Three-pass critique (per screen)

1. **IA** — one job?
2. **Interaction** — loading / empty / error / challenge pause / keyboard?
3. **Visual** — token drift, Card abuse, hero overlay, cliché look?

---

## 10. Cross-references

- Product positioning / end-state UX → `01_PRODUCT.md`
- Constitution / Feature Acceptance Gate → `02_CONSTITUTION.md`
- Domain API / UI isolation → `04_DOMAIN_API.md`
- Capability Matrix / Account UX → `10_ACCOUNT.md`
- Desktop IA + roadmap phases → `15_DESKTOP_AND_ROADMAP.md`
- Operator next actions → `docs/setup/03_NEXT_ACTIONS.md`
- Phase 0/A docs gate → `scripts/check-phase0.ps1` (RFC **16** registered)

---

## 11. Acceptance (Phase 0 / Design Gate)

- [x] Visual direction: cool neutral ops + single accent; light default; forbidden looks listed
- [x] Typography: Pretendard + display/body/mono scale
- [x] Density: desktop-first compact
- [x] Motion: enter / CTA press / Inbox arrive only
- [x] Primitives whitelist + Card policy
- [x] Mission Center zones + CTA priority + status board vs vanity
- [x] UX Acceptance Gate + copy rules
- [x] Cross-links to `01` / `02` / `10` / `15` + setup next actions
