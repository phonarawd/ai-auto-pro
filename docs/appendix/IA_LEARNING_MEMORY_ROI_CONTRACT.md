# I-A Learning · Memory · ROI Ownership Contract (FROZEN)

**Status:** FROZEN — plan to-do `i-a` (GROK4.5/256K); **Prove** in `i-d`  
**Normative for:** `i-b` (`packages/learning` + Reflection + Confidence) / `i-c` (`packages/memory` + ROI→Policy path) — implement **this file only**; no scope explosion  
**SSOT parents:** [`11_MEMORY_KNOWLEDGE.md`](../architecture/11_MEMORY_KNOWLEDGE.md), [`02_CONSTITUTION.md`](../architecture/02_CONSTITUTION.md), [`03_ENGINES.md`](../architecture/03_ENGINES.md), [`09_ANALYTICS.md`](../architecture/09_ANALYTICS.md), [`13_GOVERNANCE.md`](../architecture/13_GOVERNANCE.md), [`14_DATABASE.md`](../architecture/14_DATABASE.md), [`S2A_STORAGE_CONTRACT.md`](S2A_STORAGE_CONTRACT.md), [`S3A_DOMAIN_API_CONTRACT.md`](S3A_DOMAIN_API_CONTRACT.md)

---

## 0. Locks & Invariants (non-negotiable)

| Lock | Rule |
|---|---|
| **Confidence gate** | Learning **auto-promotes** a policy to `active` **only if** `confidence ≥ CONFIDENCE_AUTO_PROMOTE_THRESHOLD` (**0.91**). Below threshold → `status=suggested` only — **promote count = 0** |
| **Reflection ≠ Meta** | Reflection lives in `@clime/learning` only. Meta / Executive **must not** own Reflection, Learning policies, or ROI→Policy proposals. Learning **must not** write Goals, Executive envelopes, or daily Decision ranks |
| **ROI → Policy 제안** | Measured ROI (fact) → Learning policy **proposal**. Path: Measure → Memory episode (optional) → `learning.proposeFromRoi` → LearningPolicy. Governance `PolicyRule` mutation is **proposal / Human accept** unless auto-promote threshold met |
| **strategy namespace** | Auto-promoted (or human-accepted) strategy playbooks persist as Knowledge Store items with **`namespace=strategy`**. Not Memory tables. Not Meta |
| **Four-way split** | Memory ≠ Knowledge ≠ Learning ≠ Reflection — no overlapping ownership |
| **Memory = episodes/facts** | Memory Engine stores episodes/facts only (Short→Long→Archive horizons). **Policies never** live in Memory |
| **Repository only** | Persist via `@clime/storage` ports (`learning`, `knowledge`) — no Drizzle/SQLite imports in learning/memory packages |
| **Schema versioning** | Episode, ROI snapshot, LearningPolicy body, Reflection, strategy playbook: Zod + required `schema_version` |
| **UI → Domain API** | Renderer never imports `@clime/learning` / `@clime/memory`; channels stay `domain:learning.*` / `domain:memory.*` |
| **No AI vendor SDK** | Optional `@clime/ai` port later; V1 MVP is deterministic. Vendor SDKs never in these packages |

**Forbidden (merge blockers):** Meta owning Reflection · auto-promote below 0.91 · Decision Engine writing Learning policies · Learning writing daily Decision / Goal · policies stored as Memory episodes · Prisma/Supabase · vendor SDKs · new first-class SQLite tables in Phase I

---

## 1. Package ownership

| Package | Owns | Does **not** own |
|---|---|---|
| **`@clime/learning`** (`packages/learning`) | Learning policies + Confidence Score; Reflection postmortems → policy proposals; `proposeFromRoi`; auto-promote gate; accept/reject proposals; strategy playbook write on promote/accept | Episodes/facts; Meta Executive; daily Decision; Analytics funnel store; Governance Feature flags |
| **`@clime/memory`** (`packages/memory`) | Episodes/facts (browse/search/record); ROI measurement episode recording that feeds Learning | Policies; Confidence gate; Reflection; Knowledge curated docs (except storage façade for episode JSON); Meta |
| **`@clime/storage`** | Existing `LearningPolicy` + `KnowledgeItem` — **no new tables** in Phase I | Scoring semantics |
| **`@clime/domain-api`** | Channel registry + client types for learning/memory methods | Engine logic |
| **`@clime/analytics`** | Funnel/Experiment inputs that **feed** ROI snapshots (read/produce facts) | Auto-promote; Reflection; LearningPolicy writes |
| **`@clime/meta` / Executive** | Week/month/quarter only (Phase J) — **not** Reflection | Learning / Memory / Confidence |

```text
Measure (Analytics ROI fact or fixture)
  → Memory.recordEpisode (roi / outcome fact)     [i-c]
  → Learning.proposeFromRoi                       [i-b]
       confidence ≥ 0.91 → status=active + Knowledge namespace=strategy playbook
       confidence < 0.91 → status=suggested only (Inbox / acceptProposal)
  → Reflection.runReflection → proposal → Learning (same Confidence gate)

UI → domain:memory.* (read) · domain:learning.* (list/accept/reject/propose/reflect)
```

---

## 2. Confidence gate (frozen)

```ts
/** Constitution example 91% — frozen V1 default */
export const CONFIDENCE_AUTO_PROMOTE_THRESHOLD = 0.91;
```

| Confidence | Auto-promote | Status after `proposeFromRoi` / Reflection |
|---|---|---|
| `≥ 0.91` | **Yes** | `active` + optional strategy playbook upsert |
| `< 0.91` | **No** | `suggested` only — human `acceptProposal` required to activate |

`acceptProposal` may activate a `suggested` policy regardless of original confidence (human gate).  
`rejectProposal` → `rejected`.

**Merge blocker:** any path that sets `status=active` without either (a) `confidence ≥ 0.91` at propose time, or (b) explicit `acceptProposal`.

---

## 3. Memory Engine (`i-c`) — episodes/facts

### 3.1 Persistence (JSON-until-hot)

No new SQLite table. Episodes persist as `KnowledgeItem`:

| Field | Value |
|---|---|
| `namespace` | `memory` |
| `type` | `episode` \| `fact` |
| `body` | Zod envelope below |

### 3.2 Episode envelope

```ts
{
  schema_version: 1,
  kind: "memory.episode",
  id: string,
  projectId: string,
  episodeKind: "user" | "campaign" | "keyword" | "brand" | "ai" | "roi",
  horizon: "short" | "long" | "archive",
  summary: string,
  facts: Record<string, unknown>,   // e.g. { ctr: 0.11, topic: "X" }
  occurredAt: string,               // ISO-8601
  createdAt: string,
  traceId?: string
}
```

### 3.3 MemoryAPI (Domain)

| Method | Kind | Notes |
|---|---|---|
| `listEpisodes` | [Q] | Browse by project / horizon / episodeKind |
| `getEpisode` | [Q] | Single episode |
| `search` | [Q] | Summary / fact text search |

Writes: engine `recordEpisode` (called from Learning ROI path / workflow) — **not** ad-hoc renderer writes in V1 (S3A). Optional Domain `memory.recordEpisode` **[C]** allowed for host/tests; renderer should not drive aggressive Memory writes without confirm (RFC 11).

### 3.4 Horizons

```text
Short → Long (~30d heuristic OK in V1) → Archive
```

V1 may leave horizon as tagged metadata without a background archiver job.

---

## 4. Learning Engine (`i-b`) — policies + Reflection

### 4.1 LearningPolicy persistence

First-class table `learning_policy` (S2A §3.24):

| Column | Notes |
|---|---|
| `policy_json` | Envelope (§4.2) |
| `confidence` | 0..1 |
| `status` | `suggested` \| `active` \| `rejected` |

### 4.2 Policy envelope (`policy_json`)

```ts
{
  schema_version: 1,
  kind: "learning.policy",
  id: string,
  projectId: string,
  title: string,
  proposalSource: "roi" | "reflection" | "experiment" | "manual",
  recommendation: string,          // e.g. "increase reels share"
  proposedRule?: {                 // optional Governance hint (not auto-applied below threshold)
    featureKey?: string,
    scope: "global" | "project" | "user",
    scopeId?: string | null,
    ruleHint: Record<string, unknown>
  },
  roiSnapshotId?: string,
  reflectionId?: string,
  strategyPlaybookId?: string,     // KnowledgeItem id when promoted/accepted
  createdAt: string,
  updatedAt: string,
  traceId?: string
}
```

### 4.3 ROI snapshot input (measured fact → proposal)

```ts
{
  schema_version: 1,
  kind: "learning.roi_snapshot",
  id: string,
  projectId: string,
  /** Measured relative ROI / lift — treat as fact when isEstimate=false */
  measuredRoi: number,
  baselineRoi?: number,
  formatHint?: string,             // e.g. "reels"
  channelHint?: string,
  sampleSize?: number,
  isEstimate: boolean,             // false for measured Analytics path
  estimateLabel?: "추정",          // required when isEstimate=true
  confidence: number,              // 0..1 — drives auto-promote gate
  summary: string,
  measuredAt: string,
  traceId?: string
}
```

`proposeFromRoi(snapshot)`:

1. Record Memory episode (`episodeKind: "roi"`) via Memory port  
2. Create LearningPolicy with same `confidence`  
3. If `confidence ≥ 0.91` → `active` + upsert Knowledge `namespace=strategy` playbook  
4. Else → `suggested` only (**no** strategy auto-write required; may still draft playbook body inside policy_json)

### 4.4 Reflection

```ts
{
  schema_version: 1,
  kind: "learning.reflection",
  id: string,
  projectId: string,
  title: string,
  postmortem: string,
  confidence: number,
  proposalId?: string,             // LearningPolicy id created
  createdAt: string,
  traceId?: string
}
```

`runReflection` → creates Reflection record (JSON-until-hot: Knowledge `namespace=learning`, `type=reflection`) + LearningPolicy proposal with same Confidence gate.  
**Must not** enqueue daily Decision, write Goal, or call Executive APIs.

### 4.5 LearningAPI (Domain)

| Method | Kind | Owner | Notes |
|---|---|---|---|
| `listPolicies` | [Q] | learning | |
| `getPolicy` | [Q] | learning | |
| `acceptProposal` | [C] | learning | `suggested` → `active` + strategy playbook |
| `rejectProposal` | [C] | learning | → `rejected` |
| `getConfidence` | [Q] | learning | Project summary: threshold + counts |
| `listReflections` | [Q] | learning | |
| `proposeFromRoi` | [C] | learning | **NEW** — ROI→Policy path |
| `runReflection` | [C] | learning | **NEW** — Reflection job |

---

## 5. Strategy playbook (Knowledge `namespace=strategy`)

On auto-promote or `acceptProposal`:

```ts
{
  schema_version: 1,
  kind: "knowledge.strategy_playbook",
  id: string,
  projectId: string,
  title: string,
  body: string,
  sourcePolicyId: string,
  confidence: number,
  createdAt: string
}
```

Persisted: `KnowledgeItem` `{ namespace: "strategy", type: "playbook", body: envelope }`.

---

## 6. Import DAG (frozen)

```text
@clime/memory     → @clime/shared, zod, @clime/storage (knowledge)
@clime/learning   → @clime/shared, zod, @clime/storage (learning + knowledge),
                    @clime/memory (recordEpisode port ONLY)

@clime/memory     → must NOT import @clime/learning (cycle forbidden)
@clime/learning   → must NOT import @clime/meta, @clime/growth-decision,
                    @clime/automation worker internals
@clime/analytics  → may produce ROI facts; must NOT write LearningPolicy

apps/desktop main → wires memory + learning handlers (override stubs)
Renderer          → DomainClient only

NO drizzle/sqlite · NO playwright · NO platform SDKs ·
NO Meta Reflection · NO auto-promote < 0.91
```

---

## 7. Feature keys (seed-compatible)

| Feature key | Gates |
|---|---|
| `feature.memory.listEpisodes` | List |
| `feature.memory.getEpisode` | Get |
| `feature.memory.search` | Search |
| `feature.memory.recordEpisode` | Record (optional C) |
| `feature.learning.listPolicies` | List |
| `feature.learning.getPolicy` | Get |
| `feature.learning.acceptProposal` | Accept |
| `feature.learning.rejectProposal` | Reject |
| `feature.learning.getConfidence` | Confidence summary |
| `feature.learning.listReflections` | Reflections |
| `feature.learning.proposeFromRoi` | ROI→Policy |
| `feature.learning.runReflection` | Reflection |

---

## 8. Prove checklist (`i-d`)

- [ ] Reflection / Learning live under `@clime/learning` — **Meta pollution 0** (no Goal/Executive/daily Decision writes; no `@clime/meta` import)
- [ ] Auto-promote with `confidence < 0.91` = **0** promotions to `active`
- [ ] Auto-promote with `confidence ≥ 0.91` → `active` + `namespace=strategy` playbook
- [ ] Memory episodes only (`namespace=memory`) — policies not stored as episodes
- [ ] ROI→Policy path: `proposeFromRoi` creates LearningPolicy; Memory ROI episode recorded
- [ ] `acceptProposal` / `rejectProposal` work for suggested policies
- [ ] Domain API channels wired in desktop host
- [ ] Prisma / Supabase / Playwright / vendor SDK deps = 0
- [ ] `pnpm lint` / `typecheck` / `test` GREEN

---

## 9. Explicit non-goals (out of Phase I)

- Meta Executive package / Dashboard (Phase J)
- Cross-project Knowledge Evolution 2.0 (L+)
- Full Governance `PolicyRule` auto-mutation beyond LearningPolicy + strategy playbook
- Background Memory archiver cron
- New first-class DB tables
- Paid Ads / spend automation
- AI vendor Reflection narratives (deterministic V1 OK)

---

## 10. Handoff

| Part | Model | Deliverable |
|---|---|---|
| `i-a` | GROK4.5 | **This contract FROZEN** |
| `i-b` | COMPOSER2.5 | `packages/learning` + Reflection + Confidence threshold |
| `i-c` | COMPOSER2.5 | `packages/memory` + ROI→Policy proposal path |
| `i-d` | GROK4.5 | Prove doc + GREEN gates |

**Do not** let Meta own Reflection. **Do not** auto-promote below 0.91. **Do not** store policies in Memory.
