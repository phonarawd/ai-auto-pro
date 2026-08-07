# C1-A Content Contract (FROZEN)

**Status:** FROZEN — plan to-do `c1-a` (GROK4.5/256K); **Prove** in `c1-d`  
**Normative for:** `c1-b` (Produce/Validate/Optimize/7-channel Repurposer) / `c1-c` (Export backup + History enums) — implement **this file only**; no scope expansion  
**Anchors:** `(vg-a §3` Repurposer + 7-channel table`)` · `(vg-a .clime` Export backup separation`)` — [`VGA_VIRAL_GROWTH_CONTRACT.md`](VGA_VIRAL_GROWTH_CONTRACT.md)  
**SSOT parents:** [`08_CONTENT.md`](../architecture/08_CONTENT.md), [`05_WORKFLOW.md`](../architecture/05_WORKFLOW.md), [`02_CONSTITUTION.md`](../architecture/02_CONSTITUTION.md), [`14_DATABASE.md`](../architecture/14_DATABASE.md), [`S3A_DOMAIN_API_CONTRACT.md`](S3A_DOMAIN_API_CONTRACT.md), [`B3A_WORKFLOW_AUTOMATION_CONTRACT.md`](B3A_WORKFLOW_AUTOMATION_CONTRACT.md), [`S45A_AI_ADAPTER_COST_CONTRACT.md`](S45A_AI_ADAPTER_COST_CONTRACT.md)

---

## 0. Locks & Invariants (non-negotiable)

| Lock | Rule |
|---|---|
| **Pipeline order** | Happy content path only: **Produce → Validate (required) → Optimize and/or Repurpose**. Publish handoff is C2; Export backup is parallel (C1-C) |
| **Validate skip = 0** | Illegal to call Optimize / Repurpose / mark READY for publish path without a successful Validate on that artifact (or its source pack). No “speed mode” Feature flag bypass |
| **7-channel Repurposer** | 1 source → exactly the **7** channel ids frozen in vg-a §3 (templates in `@clime/content`) |
| **Export = backup only** | `content.exportPack` writes **`Exports/YYYY-MM-DD/**`** backup packs. Never the sole auto-publish success when Matrix `canPublish`. **Never** writes `*.clime` (viral playbook = `vg-d` only) |
| **History enums** | `PublishingHistoryEvent.kind` is **exactly**: `draft` \| `export` \| `scheduled` \| `posted_manual` \| `posted_api` \| `posted_session` — Zod at append boundary; inventing kinds = merge blocker |
| **No AI vendor SDK** | Content calls AI only through `@clime/ai` `AIEngine` port (optional injectable). OpenAI/Gemini/Claude/… SDKs **never** in `packages/content` |
| **Repository only** | Persist via `@clime/storage` ContentRepository — no Drizzle/SQLite imports |
| **Schema versioning** | Artifact meta, Validate report, Export manifest, Repurpose pack: Zod + required `schema_version` |
| **Topic ownership** | Content does **not** decide daily mix / Topic priority (Decision / planning) |
| **No captcha bypass** | Challenge pause remains Account/C2 — Content must not flip history to `posted_*` on challenge |

**Forbidden (merge blockers):** Validate skip · Optimize/Repurpose before Validate · Export as sole success path · Merging Export backup with `.clime` · Platform SDKs in content · Prisma/Supabase clients · New first-class tables (use existing `ContentItem` / `PublishingHistoryEvent`) · Captcha solve CTA

---

## 1. Package ownership

| Package | Owns | Does **not** own |
|---|---|---|
| **`@clime/content`** (`packages/content`) | Produce; Validate gate + checks; Optimize; 7-channel Repurposer + templates; Export backup writer; History kind enforcement; ContentAPI handlers | Live publish (C2); `.clime` IO (`vg-d`); Topic/Decision; Brand Intelligence source-of-truth (`growth/research` — Content **consumes** rules); BAE/Playwright |
| **`@clime/storage`** | Existing `ContentItem` / `PublishingHistoryEvent` ports (no new tables for C1) | Business Validate legality |
| **`@clime/workflow`** | Task SM Validate-skip = 0 (already DONE) | Content artifact engines |
| **`@clime/ai`** | Adapter + Cost (optional injection) | Content pipeline orchestration |

```text
UI → domain:content.*
  → ContentEngine
      produce → ContentItem(status=draft) + history kind=draft
      validate → checks → status=validated (or fail)
      optimize / repurpose → REJECT unless validated
      exportPack → Exports/YYYY-MM-DD/ + history kind=export
  → Storage ContentRepository only
```

---

## 2. Artifact & status model (lean)

### 2.1 `ContentItem` (existing table)

| Field | C1 meaning |
|---|---|
| `channel` | Channel id (`source` for original; one of 7 for repurposed; or template channel) |
| `format` | e.g. `text` / `thread` / `script` / `longform` |
| `status` | Content lifecycle (below) — **not** Task SM |
| `metaJson` | Zod envelope with `schema_version` (body, title, hooks, validation report, pack refs, …) |
| `targetAccountId` | Optional account grounding |
| `artifactRef` | Optional blob/path ref |

### 2.2 Content lifecycle status (package enum)

```text
draft → validated → optimized | ready
         ↘ failed_validation
```

| Status | Meaning |
|---|---|
| `draft` | Produced; **not** eligible for Optimize/Repurpose |
| `validated` | Passed Validate; Optimize/Repurpose allowed |
| `optimized` | Post-Optimize pass |
| `ready` | Quality gate OK for review/publish handoff |
| `failed_validation` | Validate failed; must re-Produce or repair then Validate again |

**Gate:** `optimize` / `repurpose` accept only `validated` \| `optimized` \| `ready`.  
`draft` \| `failed_validation` → `{ ok:false, code:"VALIDATE_REQUIRED" }` (Validate skip = 0).

### 2.3 Artifact meta envelope (normative shape)

```ts
{
  schema_version: 1,
  kind: "content.artifact",
  title?: string,
  body: string,
  prompt?: string,
  hooks?: string[],
  hashtags?: string[],
  sourceContentItemId?: string,   // set on repurposed children
  packId?: string,                // shared across 7-channel pack
  validation?: {
    passed: boolean,
    checkedAt: string,            // ISO-8601
    errors: string[],
    checks: Record<string, "pass" | "fail" | "skip">
  }
}
```

---

## 3. Produce

| Step | Behavior |
|---|---|
| Input | `projectId`, `body` / `prompt`, optional `title`, `channel` (default `source`), `format`, `targetAccountId`, `workflowRunId`, `traceId` |
| Persist | `ContentItem` with `status=draft`; `metaJson` envelope |
| History | Append `kind=draft` |
| AI | Optional `AIEngine.complete` — if absent, deterministic Produce from input text (V1 tests must not require paid cloud) |
| Output | `{ contentItemId, status:"draft", traceId }` |

Produce **never** marks `validated` / `ready` / `posted_*`.

---

## 4. Validate (mandatory)

### 4.1 Checks (V1 minimum)

| Check id | Rule |
|---|---|
| `schema` | `metaJson` parses artifact envelope (`schema_version` required) |
| `body_nonempty` | `body` trim length ≥ 1 |
| `forbidden_phrases` | Configurable list (default includes exaggerated earnings / “guaranteed profit” style phrases) — fail if matched |
| `channel_template` | If channel is one of the 7, body respects template constraints (max length / required sections) |
| `brand_stub` | Optional injectable brand rules; absent → `skip` (real Brand Intelligence = Phase F / research) |

### 4.2 Outcomes

| Result | Persist | History |
|---|---|---|
| Pass | `status=validated`; `validation.passed=true` | No `posted_*`; optional meta-only |
| Fail | `status=failed_validation`; errors in `validation.errors` | Must not advance to Optimize |

Validate is **sync Command** at Domain API (`content.validate`) — suitable for Workflow `content.validate` node.

---

## 5. Optimize

| Rule | Norm |
|---|---|
| Prerequisite | Item status ∈ {`validated`,`optimized`,`ready`} else **VALIDATE_REQUIRED** |
| Behavior | Hook/title/hashtag/SEO light pass on body (deterministic + optional AI) |
| Persist | Update meta; `status=optimized` (or `ready` if quality score ≥ threshold) |
| Skip Validate | **Forbidden** |

---

## 6. Repurpose — 7-channel (vg-a §3)

### 6.1 Canonical channel ids (frozen)

| # | Channel id | Template intent | Default export filename |
|---|---|---|---|
| 1 | `x_thread` | X / Twitter thread | `X.txt` |
| 2 | `instagram` | Instagram caption pack | `Instagram.txt` |
| 3 | `tiktok` | TikTok script / shot list | `TikTok.txt` |
| 4 | `threads` | Meta Threads post | `Threads.txt` |
| 5 | `linkedin` | LinkedIn post | `LinkedIn.txt` |
| 6 | `youtube_shorts` | YouTube Shorts script | `YouTube_Shorts.txt` |
| 7 | `blog` | Long-form / Naver-style body | `Blog.md` |

Viral DoD counts **these 7**. Additional channels may exist later — not required for C1.

### 6.2 Controls

| Control | Normative behavior |
|---|---|
| **One source → seven** | Single validated `ContentItem` → 7 child items (same `packId`) |
| **Validate gate** | Source must be validated **before** repurpose starts |
| **Per-child Validate** | Each of the 7 artifacts is Validate’d before pack returns success; any fail → pack incomplete / `ok:false` with `traceId` (no silent partial READY) |
| **Cost** | Prefer free_local / deterministic templates for V1 prove; paid API not required |
| **History** | Children may append `draft` on create; Export uses `export` (C1-C) |

### 6.3 API

`content.repurpose` ([A] async ack with `jobId` **or** sync engine method used by workers):

```text
in:  { contentItemId, projectId, traceId }
out: { schema_version, packId, channelItemIds: Record<channelId, id>, jobId? }
```

Domain async methods return `{ jobId, traceId }` immediately when wired as [A]; engine core remains testable sync.

---

## 7. Export backup (`c1-c`)

### 7.1 Path law

```text
{exportRoot}/Exports/YYYY-MM-DD/
  Blog.md
  Instagram.txt
  Threads.txt
  X.txt
  TikTok.txt
  LinkedIn.txt
  YouTube_Shorts.txt
  Hashtags.txt          # optional aggregate
  Prompt.txt
  accounts.json
  manifest.json         # schema_version + kind:"content.export_backup"
```

- Date folder = UTC calendar day of export (ISO `YYYY-MM-DD`) unless caller supplies `exportDate`.
- **`kind` in manifest must be `content.export_backup`** — never `clime.playbook`.
- **No file may use `.clime` extension** under Export backup paths.

### 7.2 `accounts.json`

```ts
{
  schema_version: 1,
  kind: "content.export_accounts",
  accounts: Array<{ contentItemId: string; channel: string; targetAccountId: string | null; file: string }>
}
```

### 7.3 History

On successful write: append `PublishingHistoryEvent` with `kind=export`, `exportPath` = relative `Exports/YYYY-MM-DD/…`.

### 7.4 Separation from `.clime` (vg-d)

| | Export backup (`c1-c`) | `.clime` (`vg-d`) |
|---|---|---|
| Path | `Exports/YYYY-MM-DD/**` | `*.clime` |
| Purpose | Backup log / P2 manual | Portable playbook |
| Owner | `@clime/content` export | `vg-d` module |
| Success | Never sole auto-publish | Import ≠ `PUBLISHED` |

**Merge blocker:** one code path that writes both formats under a single undifferentiated “export” without distinguishing backup vs playbook.

---

## 8. Publishing History enums (`c1-c`)

Frozen in `@clime/shared` `publishingHistoryKindSchema` — Content **must not** widen:

```text
draft | export | scheduled | posted_manual | posted_api | posted_session
```

| Kind | Writer in C1 |
|---|---|
| `draft` | Produce / repurpose child create |
| `export` | `exportPack` |
| `scheduled` / `posted_*` | **Not** written by C1 happy path (C2 / future schedule) — Content may expose typed helper but must reject unknown strings |

Challenge / failed publish must not silently write `posted_api` / `posted_session`.

---

## 9. Domain API (frozen channels)

IPC: `domain:content.<method>` + envelope `{ requestId, schema_version, traceId }` (S3A §5.2).

| Method | Kind | Notes |
|---|---|---|
| `enqueueGenerate` | A | Produce path; returns `jobId` (may enqueue via Automation later; V1 may run Produce then ack) |
| `getArtifact` | Q | By `contentItemId` |
| `validate` | C | Sync Validate gate |
| `optimize` | A | Requires validated |
| `repurpose` | A | 7-channel; requires validated source |
| `exportPack` | C | Backup only → `Exports/YYYY-MM-DD/` |
| `listHistory` | Q | Returns rows; kinds are frozen enum |

---

## 10. Domain events (emit when bus available)

| Event | When |
|---|---|
| `ContentGenerated` | Produce success |
| `ContentValidated` | Validate pass |
| `ContentRepurposed` | 7-channel pack complete (vg-a) |
| `ContentReadyForReview` | status→`ready` |
| `ContentExported` | Export backup written |

Publish events (`ContentPublishedApi` / `Session` / `Paused`) = **C2**.

---

## 11. Import DAG (frozen)

```text
@clime/content → @clime/shared, zod, @clime/storage (ports only),
                 optional @clime/ai (AIEngine type/port only)
                 NO drizzle/sqlite · NO playwright · NO platform SDKs ·
                 NO .clime writer · NO UI · NO vendor openai/gemini/…

apps/desktop main → wires Content domain handlers
Renderer          → DomainClient only
```

---

## 12. Prove checklist (`c1-d`)

- [ ] `@clime/content` exists; Prisma/Supabase/Playwright/vendor SDK deps = 0
- [ ] Optimize/Repurpose on `draft` → `VALIDATE_REQUIRED` (Validate skip = 0)
- [ ] Repurpose produces all **7** channel ids; each Validate’d
- [ ] `exportPack` writes only under `Exports/YYYY-MM-DD/`; manifest `kind=content.export_backup`; **`.clime` file count = 0**
- [ ] History append accepts only frozen enums; unknown kind rejected
- [ ] Export ≠ sole publish success (no `posted_*` written by export)
- [ ] `pnpm lint` / `typecheck` / `test` GREEN

---

## 13. Explicit non-goals (out of C1)

- Live API/session publish, jitter, quota (C2)
- `.clime` playbook export/import (`vg-d`)
- Full Brand Intelligence engine (research / Phase F) — stub rules OK
- Perfect binary media render per channel
- Topic Generator / Decision daily mix
- New SQLite tables
- Paid Ads / HumanGate spend paths

---

## 14. Handoff

| Part | Model | Deliverable |
|---|---|---|
| `c1-a` | GROK4.5 | **This contract FROZEN** |
| `c1-b` | COMPOSER2.5 | Produce / Validate / Optimize / 7-channel Repurposer per §§3–6 |
| `c1-c` | COMPOSER2.5 | Export backup §7 + History enums §8 + tests |
| `c1-d` | GROK4.5 | Prove doc + GREEN gates |

**Do not** implement `.clime` in `c1-b`/`c1-c`. **Do not** skip Validate for Repurpose.
