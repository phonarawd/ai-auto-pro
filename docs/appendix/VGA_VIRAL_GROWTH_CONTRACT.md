# VG-A Zero-Cost Viral Growth Contract (FROZEN)

**Status:** FROZEN — plan to-do `vg-a` (GROK4.5/256K); **code = 0** (this file only)  
**Normative for:** all owning to-dos below (`g-b`, `vg-b`, `d-b`, `vg-c`, `c1-b`, `c1-c`, `b3-b`, `vg-d`) — implement **under their slice contracts**; do **not** invent a parallel viral engine or top-level package  
**Cross-prove:** `vg-e` (GROK4.5) — full 4-item audit + **paid API = 0** immediately after `vg-b`/`vg-c`/`vg-d` (and base owners) are DONE  
**SSOT parents:** plan “Zero-Cost Viral Growth Engine” section; [`02_CONSTITUTION.md`](../architecture/02_CONSTITUTION.md), [`05_WORKFLOW.md`](../architecture/05_WORKFLOW.md), [`06_GROWTH.md`](../architecture/06_GROWTH.md), [`07_AI.md`](../architecture/07_AI.md), [`08_CONTENT.md`](../architecture/08_CONTENT.md), [`14_DATABASE.md`](../architecture/14_DATABASE.md), [`16_DESIGN_SYSTEM.md`](../architecture/16_DESIGN_SYSTEM.md); frozen peers [`XA_FORTIFICATION_CONTRACT.md`](XA_FORTIFICATION_CONTRACT.md), [`B3A_WORKFLOW_AUTOMATION_CONTRACT.md`](B3A_WORKFLOW_AUTOMATION_CONTRACT.md), [`S45A_AI_ADAPTER_COST_CONTRACT.md`](S45A_AI_ADAPTER_COST_CONTRACT.md)

---

## 0. Locks (non-negotiable)

| Lock | Rule |
|---|---|
| Ownership | Each of the **4 viral items** has **exactly one** viral-layer owner (`vg-b` / `vg-c` / `c1-b` / `vg-d`) plus named **base** owners — **duplicate viral packages = merge blocker** |
| Scope of `vg-a` | **Document only** — no packages, migrations, UI, or runtime code in this to-do |
| Scope of `vg-e` | **Prove only** — no new features; stamp GREEN/FAIL against this contract |
| Cost | Viral Growth paths use **Ollama / free-tier adapters only** (`BudgetClass: free_local` or documented free cloud tier). **Paid API spend on viral paths = 0** |
| Package home | No new top-level engine. Viral logic lives under existing umbrellas: `growth/research`, `growth/planning` (inputs), `packages/content`, Workflow DSL — plus thin viral export/badge modules owned by `vg-*` |
| Export ≠ `.clime` | **`c1-c` Export backup** (`Exports/YYYY-MM-DD/`) is **never** the viral playbook format. **`.clime` = `vg-d` only** |
| Schema | Every `.clime` document and viral export manifest carries **`schema_version`** + Zod at boundaries |
| Workflow | Viral generation/publish still run as **Workflow Nodes** via Planner Queue — START / viral CTA must not bypass Queue |
| Validate | Repurpose / Multi-Jack / Micro-Audit artifacts that enter publish path **must Validate** first (constitutional) |
| Badge honesty | Referral / “Powered by” badge is **attribution + growth loop**, not a Capability Matrix lie and not a hero floating promo sticker |
| Safety | Captcha bypass · fingerprint spoof · proxy laundering · spam botnet = **0** (inherited Constitution / x-a §2) |
| Ads | Paid Ads spend remains **HumanGate** — viral engine must not open spend paths |

**Forbidden (merge blockers):** Treating Export backup as `.clime` · Shipping viral features that require paid LLM/API · New `packages/viral` god-object · Badge that implies auto-publish when `canPublish:false` · Silent paid API fallback on viral jobs · Captcha solve CTAs on shared playbooks · Prisma / Supabase product paths.

---

## 1. Master map — 4 items → owning to-do ids

| § | Item | Killer outcome | Base owner (engine) | Viral-layer owner | Depends on (DONE before viral owner starts) |
|---|---|---|---|---|---|
| **1** | AI Micro-Audit & Competitor Teardown + viral export | ~10s public diagnosis → PDF/infographic + tailored playbook | `g-b` (Competitor/Gap/Viral under `growth/research`) | `vg-b` (PDF/info export + badge + referral) | `g-b` |
| **2** | Zero-Cost Organic Trend Multi-Jack | Hot topic → persona-fit meme / card news / Shorts / Threads variants | `d-b` (Trend Source Layer + Normalizer) | `vg-c` (auto multi-format variant pack) | `d-b` |
| **3** | 1-Click 7-Channel Repurposer | One source → **7** channel artifacts | `c1-b` (Repurpose inside `packages/content`; Validate required) | *(same — item is Content-owned; no separate `vg-*` id)* | `c1-a` |
| **4** | Self-Propagating `.clime` Playbook | workflow + prompt + timing pack → share/import community loop | `b3-b` (Workflow DSL shape) · `c1-c` (Export backup **separation** proven) | `vg-d` (`.clime` export/import **only**) | `c1-c`, `b3-b` |

**Split rules (do not move):**

| Concern | Owner | Not owner |
|---|---|---|
| Competitor/Gap/Viral research analysis | `g-b` / `growth/research` | `vg-b` (adds export + badge only) |
| Trend ingest (Google Trends / Naver / X free RSS / public scrape) | `d-b` | `vg-c` (variant generation only) |
| Repurpose transform + Validate gate | `c1-b` | `vg-*` |
| Dated Export backup packs | `c1-c` | `vg-d` |
| Workflow DSL + `schema_version` runtime | `b3-b` / `@clime/workflow` | `vg-d` (serializes playbook; does not redefine Task SM) |
| Badge + referral embed on viral artifacts | `vg-b` (rules in §3; may be reused by `vg-d` share footer) | Mission Center Capability badges (`b1` / `s8`) |

**Plan click order reminder:** `vg-a` freezes this contract (may run after `b3-d`, before C1). Implement `vg-b` / `vg-c` / `vg-d` only after their Depends-on columns are DONE (plan places them after G / D / C1 respectively). `vg-e` proves all four.

---

## 2. Item §1 — AI Micro-Audit & Competitor Teardown → `g-b` + `vg-b`

### 2.1 Controls

| Control | Normative behavior | Owner |
|---|---|---|
| **Public sources only** | Inputs = public SNS/URL + open RSS / allowed public scrape — no private session steal, no captcha bypass | `g-b` |
| **Teardown artifact** | Structured diagnosis: trend fit, copy patterns, keyword/gap notes, CLIME-fit tips; Zod + `schema_version` | `g-b` |
| **Viral export** | Render shareable PDF and/or infographic pack from teardown (local/free render path) | `vg-b` |
| **Badge + referral** | Every viral export includes Powered-by badge + referral link per §3 | `vg-b` |
| **Cost** | Analysis + render on free_local / free-tier adapters only | `vg-b` + AI Cost path (`s4.5`) |

### 2.2 Acceptance criteria (owners prove; `vg-e` rechecks)

- [ ] Public URL/SNS → teardown document with `schema_version` (`g-b`)
- [ ] PDF and/or infographic export path exists and is not an Export backup pack (`vg-b`)
- [ ] Badge + referral present on viral export; removable only via explicit user opt-out prefs (default **on** for free viral path) (`vg-b`)
- [ ] Paid vendor API calls attributed to this path = **0** in Cost/usage records (`vg-e`)
- [ ] No challenge bypass; scrape failures → Inbox/`traceId`, not silent fake scores

### 2.3 Explicit non-goals for §1

- Full Competitor Spy+ / Listening+ (Phase L+)
- Paid social APIs as V1 requirement
- Hero floating promo stickers on Mission Center (Design SSOT)

---

## 3. Referral badge rules (normative for `vg-b`; reused by `vg-d`)

### 3.1 Identity

| Field | Frozen value |
|---|---|
| Product brand (app) | **CLIME AI Growth Studio** |
| Architecture name (docs/engines) | **CLIME AI Growth Operating System** |
| Badge wordmark (viral surfaces) | **Powered by CLIME Growth OS** |
| Badge purpose | Attribution + zero-cost acquisition loop — **not** Capability Matrix |

### 3.2 Required elements on viral surfaces

Viral surfaces = Micro-Audit PDF/infographic (`vg-b`), optional share footer on `.clime` packs (`vg-d`), and any user-facing “share this diagnosis” card.

| Element | Rule |
|---|---|
| **Wordmark** | Exact string `Powered by CLIME Growth OS` (or localized equivalent that preserves “CLIME Growth OS”) |
| **Referral link** | Absolute HTTPS URL including stable referral code query/path (format owned by `vg-b` implementation; must be Zod-validated) |
| **Referral code** | Opaque per-installer or per-project code; **no PII** in the code itself |
| **Placement** | Footer / end-matter of export — **never** floating overlay on Mission Center hero; never covering Capability badges |
| **Visual** | Uses `--clime-*` tokens + Pretendard when rendered in-app; PDF may embed subset fonts; **no** purple-glow SaaS cliché required by Design SSOT |
| **Honesty** | Must not claim `canPublish` / auto-publish success; must not hide Matrix limits |
| **Default** | Embedded **on** for zero-cost viral exports; Settings may allow removal only if product policy later permits (V1 default = keep on free path) |

### 3.3 Referral payload (boundary shape)

```ts
// schema_version required at boundary
type ClimeReferralBadge = {
  schema_version: "1";
  kind: "clime.referral_badge";
  wordmark: "Powered by CLIME Growth OS";
  referralCode: string;       // opaque, non-empty
  referralUrl: string;        // https URL including code
  locale?: string;            // BCP-47 optional
  placedOn: "micro_audit_export" | "clime_playbook_share" | "other_viral";
};
```

### 3.4 Forbidden badge behaviors

- Capability Matrix impersonation (`canPublish` / `publishMode` / `riskLevel` forged)
- Captcha / unlock / “bypass challenge” CTAs inside badge or referral landing copy
- Tracking pixels that require paid third-party marketing suites (V1)
- Embedding secrets, session cookies, vault refs, or account tokens in referral URL

---

## 4. Item §2 — Zero-Cost Organic Trend Multi-Jack → `d-b` + `vg-c`

### 4.1 Controls

| Control | Normative behavior | Owner |
|---|---|---|
| **Free trend sources** | Google Trends · Naver · X (and peers) via **free RSS / public** paths documented in Trend Source Layer | `d-b` |
| **Normalizer** | Unified trend score + CLIME-fit + format tips (`06`) | `d-b` |
| **Multi-Jack pack** | Hot topic → persona-conditioned variants: at minimum meme, card-news, Shorts script, Threads post (exact set frozen in `vg-c` contract/impl) | `vg-c` |
| **Persona input** | Persona/Emotion from `growth/research` prefs — Settings UI does not own engine | `vg-c` reads research; K1 prefs UI only |
| **Cost** | Variant generation = free_local / free-tier only | `vg-c` |

### 4.2 Acceptance criteria

- [ ] Trend Source Layer can ingest ≥1 free public source without paid API key (`d-b`)
- [ ] Multi-Jack produces multi-format pack with `schema_version` (`vg-c`)
- [ ] Packs entering publish path pass Validate (`c1` / Workflow)
- [ ] Paid API count on Multi-Jack path = **0** (`vg-e`)

### 4.3 Explicit non-goals for §2

- Purchased trend firehoses / paid social listening as V1 dependency
- Auto-publish without Matrix / Queue / Validate

---

## 5. Item §3 — 1-Click 7-Channel Repurposer → `c1-b`

### 5.1 Canonical 7 channels (frozen for V1 viral DoD)

| # | Channel id | Surface intent |
|---|---|---|
| 1 | `x_thread` | X / Twitter thread |
| 2 | `instagram` | Instagram feed/caption pack |
| 3 | `tiktok` | TikTok script / shot list |
| 4 | `threads` | Meta Threads post |
| 5 | `linkedin` | LinkedIn post |
| 6 | `youtube_shorts` | YouTube Shorts script |
| 7 | `blog` | Long-form blog / Naver-style article body |

Additional channels (Reels, NaverBlog, …) may exist in Content — **viral DoD counts these 7**. UI “1-Click” produces all seven from one source artifact.

### 5.2 Controls

| Control | Normative behavior | Owner |
|---|---|---|
| **One source → seven** | Single ContentItem / approved source → 7 channel artifacts | `c1-b` |
| **Validate** | Each artifact (or pack) passes Validate before Optimize/Publish | `c1-b` |
| **Cost** | Ollama / free-tier only for this viral DoD path | `c1-b` + `s4.5` |
| **History** | Publishing History enums unchanged; Export backup remains parallel (`c1-c`) | `c1-b`/`c1-c` |

### 5.3 Acceptance criteria

- [ ] 1-click API/UI produces artifacts for all 7 channel ids
- [ ] Validate cannot be skipped (Task SM / Workflow gate)
- [ ] Paid API on this path = **0** for viral DoD prove (`vg-e`)

### 5.4 Explicit non-goals for §3

- Perfection of every platform’s media binary render in V1 (text/script packs OK if Validate schema allows)
- Replacing Export backup

---

## 6. Item §4 — Self-Propagating `.clime` Playbook → `vg-d`

### 6.1 Hard separation from Export backup (`c1-c`)

| | Export backup (`c1-c`) | `.clime` playbook (`vg-d`) |
|---|---|---|
| **Purpose** | Parallel **backup log** / P2 manual fallback of produced content | **Portable growth playbook** for community share/import |
| **Path / extension** | `Exports/YYYY-MM-DD/**` | `*.clime` (single file or zip with manifest) |
| **Success semantics** | Never the sole auto-publish success when `canPublish` | Import registers workflow/template — does not mark `PUBLISHED` |
| **Typical contents** | Channel text files, images, `accounts.json`, Prompt.txt | Workflow DSL slice + prompts + timing + metadata |
| **Owner** | `c1-c` | `vg-d` |

**Merge blocker:** One code path that writes both formats under one “export” button without distinguishing backup vs playbook.

### 6.2 `.clime` document schema (frozen v1)

Boundary validation: Zod + `schema_version`. Unknown `schema_version` → reject import with `traceId`.

```ts
type ClimePlaybookV1 = {
  schema_version: "1";
  kind: "clime.playbook";

  /** Human title for Mission Templates / import UI */
  title: string;
  /** Optional longer description */
  summary?: string;

  /** When this pack was created (ISO-8601) */
  createdAt: string;
  /** Pack author display name — no email/phone required */
  authorLabel?: string;

  /** Optional referral badge for share loop (§3) */
  referral?: ClimeReferralBadge;

  /** Workflow slice — must align with @clime/workflow DSL (b3-b); includes schema_version internally */
  workflow: {
    schema_version: string;
    /** DSL document: nodes + edges; MUST be importable by Workflow engine */
    document: Record<string, unknown>;
  };

  /** Provider-agnostic prompt templates (ids + bodies); no vendor SDK blobs */
  prompts: Array<{
    id: string;
    version: string;
    purpose:
      | "research_summarize"
      | "content_longform"
      | "content_short"
      | "validate_json"
      | "repurpose"
      | "micro_audit"
      | "trend_multijack"
      | "generic";
    template: string;
  }>;

  /** Scheduling / cadence hints — advisory; Scheduler intelligence (H) may refine */
  timing: {
    timezone?: string;           // IANA
    preferredHoursLocal?: number[]; // 0–23
    cadence?: "once" | "daily" | "weekly" | "custom";
    jitterPolicy?: "none" | "gaussian_5_45s"; // publish still honors x-a §2 when live
  };

  /** Soft targeting — not a substitute for Capability Matrix */
  targeting?: {
    personaHints?: string[];
    channels?: Array<
      | "x_thread"
      | "instagram"
      | "tiktok"
      | "threads"
      | "linkedin"
      | "youtube_shorts"
      | "blog"
    >;
    locales?: string[];
  };

  /** Integrity / provenance */
  provenance: {
    generator: "clime.ai.growth_studio";
    contentHash?: string;        // optional hash of canonical JSON
    parentPlaybookId?: string;   // if forked from another .clime
  };
};
```

### 6.3 Import / export behavior

| Action | Normative behavior | Owner |
|---|---|---|
| **Export `.clime`** | Serialize workflow + prompts + timing (+ optional referral) → `*.clime`; Zod validate before write | `vg-d` |
| **Import `.clime`** | Zod validate → register as Mission Template / Workflow template; **never** auto-START without user/Mission Center | `vg-d` |
| **Queue law** | Running an imported playbook still goes **START → Planner Queue → Worker** | `b3` (unchanged) |
| **Secrets** | Pack **must not** contain vault secrets, session cookies, API keys, or plaintext tokens — strip on export | `vg-d` + `s4` |
| **Publish nodes** | If workflow includes `publish`, runtime still honors Matrix / challenge pause | `c2` / Matrix |

### 6.4 Acceptance criteria

- [ ] Round-trip export → import yields runnable template with same `schema_version` (`vg-d`)
- [ ] Reject packs with secrets / missing `schema_version` / unknown kind
- [ ] UI copy distinguishes “내보내기 백업” vs “`.clime` 플레이북 공유”
- [ ] Export backup folders never use `.clime` extension (`c1-c` + `vg-d`)
- [ ] Paid API = **0** on pack serialize/deserialize path

### 6.5 Explicit non-goals for §4

- Marketplace storefront (Phase L+)
- Team shared libraries / Workspace settings
- Replacing Knowledge `namespace=strategy` playbooks (may **reference** strategy ids later; V1 pack is self-contained DSL+prompts)

---

## 7. Cost & AI routing law (all 4 items)

| Rule | Detail |
|---|---|
| **Viral BudgetClass** | Prefer `free_local` (Ollama). Free-tier cloud adapters allowed only if Cost Intelligence marks them free / zero invoice |
| **Paid path** | If only paid adapters available → **fail closed** with Inbox + `traceId` + honest copy — do **not** silently charge |
| **Adapter law** | All calls through `@clime/ai` Adapters (`s4.5`); domain/viral code never imports vendor SDKs |
| **Prove** | `vg-e` (+ `s4.5-c` evidence) shows viral jobs did not select paid budget classes |

---

## 8. Package / surface placement (no god-object)

```text
growth/research/     ← Micro-Audit / Competitor / Viral analysis (g-b); Trend depth (G)
growth/planning/     ← Topic inputs only (not viral home)
packages/content/    ← 7-channel Repurpose + Validate + Export backup (c1-*)
packages/workflow/   ← DSL runtime (b3-b); .clime embeds document, does not fork SM
vg-b module seat     ← viral PDF/info export + referral badge helpers (package path chosen in vg-b; NOT packages/viral god)
vg-c module seat     ← Multi-Jack variant orchestrator (thin; calls research + content)
vg-d module seat     ← .clime serialize/deserialize + import registration
```

**Forbidden:** `packages/viral` as umbrella god-object · Core importing connector internals for scrape · UI importing engines.

---

## 9. Domain events / history (minimal V1)

Owners may emit (names illustrative; finalize in slice contracts):

| Event | When | Owner |
|---|---|---|
| `ViralMicroAuditExported` | PDF/info written with badge | `vg-b` |
| `TrendMultiJackPackReady` | Variant pack ready | `vg-c` |
| `ContentRepurposed` | 7-channel pack produced | `c1-b` |
| `ClimePlaybookExported` / `ClimePlaybookImported` | `.clime` IO | `vg-d` |

Publishing History kind `export` remains **backup-only** (`c1-c`). Do not overload it for `.clime`.

---

## 10. Anchor convention for future contracts

When writing a slice-A / VG contract that owns a viral control, cite this file:

```text
(vg-a §N)     — N = 1..4 master-map item number (Micro-Audit / Multi-Jack / Repurposer / .clime)
(vg-a badge)  — referral badge rules (doc section 3; shared by vg-b / vg-d)
(vg-a .clime) — .clime schema + Export separation (doc section 6)
```

| To-do | Anchor |
|---|---|
| `g-b` | `(vg-a §1` base analysis`)` |
| `vg-b` | `(vg-a §1` viral export + `vg-a badge`)` |
| `d-b` | `(vg-a §2` Trend Source`)` |
| `vg-c` | `(vg-a §2` Multi-Jack`)` |
| `c1-b` | `(vg-a §3` Repurposer + 7-channel table`)` |
| `c1-c` | `(vg-a .clime` Export backup separation`)` |
| `vg-d` | `(vg-a §4` + `vg-a .clime`)` |
| `vg-e` | full map + paid API 0 |

Child contracts may refine APIs/columns; they **must not** change ownership, merge Export with `.clime`, or weaken the paid-API=0 lock without amending this master file in a GROK session.

---

## 11. `vg-e` prove checklist (preview — created later)

### §1 Micro-Audit

- [ ] Teardown + viral PDF/info + badge/referral GREEN (`g-b`, `vg-b`)

### §2 Trend Multi-Jack

- [ ] Free trend source + variant pack GREEN (`d-b`, `vg-c`)

### §3 7-Channel Repurposer

- [ ] 1-click → 7 channels + Validate GREEN (`c1-b`)

### §4 `.clime` Playbook

- [ ] Schema round-trip + Export backup separation GREEN (`vg-d`, `c1-c`)

### Meta

- [ ] Paid API on viral paths = **0**
- [ ] No `packages/viral` god-object
- [ ] Queue / Validate / Matrix / challenge locks intact
- [ ] `pnpm lint` / `typecheck` / `test` GREEN at prove time

Full stamp → `docs/appendix/VGE_VIRAL_GROWTH_PROVE.md` (created by `vg-e`, not this to-do).

---

## 12. Explicit non-goals of `vg-a` itself

- Any TypeScript / migration / CI YAML / UI
- Implementing Micro-Audit PDF, Multi-Jack, Repurposer, or `.clime` IO (downstream to-dos)
- Fortification controls (owned by [`XA_FORTIFICATION_CONTRACT.md`](XA_FORTIFICATION_CONTRACT.md))
- Replacing RFCs — this contract **binds ownership + schema + badge rules**; RFC detail remains in `docs/architecture/*`
- Phase L+ Marketplace / Team Mode / Paid Ads OS

---

## 13. Handoff

| Field | Value |
|---|---|
| Contract id | `vg-a` |
| Artifact | [`VGA_VIRAL_GROWTH_CONTRACT.md`](VGA_VIRAL_GROWTH_CONTRACT.md) |
| Code changed | **0** (this contract file + next-actions note only) |
| 4 items mapped | §1 `g-b`+`vg-b` · §2 `d-b`+`vg-c` · §3 `c1-b` · §4 `vg-d` |
| `.clime` schema | §6.2 `ClimePlaybookV1` **FROZEN** |
| Referral badge | §3 **FROZEN** |
| Implement next (plan click order) | `d-a` (GROK4.5) — Research MVP + Topic contract (`c2-a`→`d` Publish GREEN) |
| Viral implement wave | `vg-b` / `vg-c` / `vg-d` after their Depends-on columns DONE |
| Final viral gate | `vg-e` before V1 DoD viral checkbox |
| Recommended model (next) | **GROK4.5** for `c1-a` |
| Do not | Implement viral code in this to-do · Merge Export backup with `.clime` · Pay for viral LLM calls · Skip to `vg-e` before owners DONE |
