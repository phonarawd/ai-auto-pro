# D-A Research / Topic Ownership Contract (FROZEN)

**Status:** FROZEN — plan to-do `d-a` (GROK4.5/256K); **Prove** in `d-d`  
**Normative for:** `d-b` (research Trend/Normalizer/Keyword + Multi-Jack content hook) / `d-c` (planning Topic Generator + Mission/Decision pipe) — implement **this file only**; no scope explosion  
**Anchors:** `(vg-a §2` Trend Multi-Jack`)` — [`VGA_VIRAL_GROWTH_CONTRACT.md`](VGA_VIRAL_GROWTH_CONTRACT.md) §4  
**SSOT parents:** [`06_GROWTH.md`](../architecture/06_GROWTH.md), [`03_ENGINES.md`](../architecture/03_ENGINES.md), [`15_DESKTOP_AND_ROADMAP.md`](../architecture/15_DESKTOP_AND_ROADMAP.md), [`14_DATABASE.md`](../architecture/14_DATABASE.md), [`S3A_DOMAIN_API_CONTRACT.md`](S3A_DOMAIN_API_CONTRACT.md), [`VGA_VIRAL_GROWTH_CONTRACT.md`](VGA_VIRAL_GROWTH_CONTRACT.md)

---

## 0. Locks & Invariants (non-negotiable)

| Lock | Rule |
|---|---|
| **Topic home = planning** | Topic Generator package home is **`packages/growth/planning`** (`@clime/growth-planning`). **Never** under `growth/research` or a sibling god-package |
| **Trend/Normalizer/Keyword = research** | Trend Source Layer, Trend Normalizer, Keyword Graph **build** live in **`packages/growth/research`** (`@clime/growth-research`) |
| **Growth umbrellas only** | Phase D adds **only** `research` + `planning` under `packages/growth/`. No `packages/viral`, no flat `packages/topic`, no Competitor/Gap/Viral depth (Phase G) |
| **Multi-Jack split** | `d-b` owns free Trend Source + Normalizer + **content hook seed**; `vg-c` owns multi-format variant pack. `d-b` must **not** implement meme/card-news/Shorts/Threads variant generation |
| **Paid trend API = 0** | Trend ingest uses free/public fixtures or RSS/public paths only — no paid social-listening SDK, no required API keys for V1 MVP prove |
| **No AI vendor SDK** | Research/planning call AI only via optional `@clime/ai` port if needed; OpenAI/Gemini/… SDKs never in these packages. V1 MVP may be deterministic (no AI) |
| **Repository only** | Persist via `@clime/storage` KnowledgeRepository (JSON-until-hot) — no Drizzle/SQLite imports in growth engines |
| **Schema versioning** | Trend snapshot, NormalizedTrend, Keyword Graph, Multi-Jack hook seed, Topic candidates: Zod + required `schema_version` |
| **Decision daily ownership** | Topic Generator does **not** emit daily Mission priority / mix — Decision Engine (Phase E) alone does |
| **UI → Domain API** | Renderer never imports `@clime/growth-*`; channels stay `domain:growth.*` |

**Forbidden (merge blockers):** Topic under research · new top-level growth umbrellas beyond the five · `packages/viral` · paid trend firehose as V1 dep · Prisma/Supabase · platform SDKs in growth · Multi-Jack full variants in `d-b` · daily ranker in Topic Generator · module explosion (Competitor/Gap/Viral/Persona engines in Phase D)

---

## 1. Package ownership

| Package | Owns | Does **not** own |
|---|---|---|
| **`@clime/growth-research`** (`packages/growth/research`) | Trend Source Layer (pluggable free sources); Trend Normalizer (unified score + CLIME-fit + format tips); Keyword Graph build/update; **Multi-Jack content hook seed** for vg-c; GrowthAPI research handlers | Topic Generator; Decision daily; Multi-Jack variant pack (`vg-c`); Competitor/Gap/Viral depth (G); Persona engine (prefs later); Knowledge Store façade god (`growth/knowledge` later) |
| **`@clime/growth-planning`** (`packages/growth/planning`) | Topic Generator; Mission/Decision **input pipe** (consumes mission + decision context + research keyword/trend inputs → topic candidates); GrowthAPI `generateTopic` | Trend ingest; Keyword Graph source-of-truth; daily priority; Planner Queue producer polish (H); Revenue |
| **`@clime/storage`** | Existing `KnowledgeItem` (JSON envelopes for trend/graph) — **no new first-class tables** for Phase D | Business scoring semantics |
| **`@clime/domain-api`** | Channel registry + client types for new growth methods | Engine logic |
| **`vg-c` (future)** | Hot topic → persona-conditioned multi-format pack | Trend Source / Normalizer |

```text
UI → domain:growth.*
  → ResearchEngine (d-b)
      ingest free sources → Normalizer → Keyword Graph
      buildMultiJackContentHook(normalized) → seed for vg-c
  → TopicGenerator (d-c)
      Mission + Decision inputs + research Keyword/Trend → Topic candidates
  → Storage KnowledgeRepository only (JSON-until-hot)
```

---

## 2. Trend Source Layer (`d-b`)

### 2.1 Source contract

| Field | Norm |
|---|---|
| `id` | Stable source id (`google_trends_public`, `naver_public`, `x_public_rss`, …) |
| `kind` | `free_public` only for V1 MVP prove |
| `fetch(projectId, traceId)` | Returns raw `TrendRawBatch` with `schema_version` |
| Capability | Sources are Capability-gated in principle; V1 MVP may always-admit free fixtures |

**V1 MVP requirement:** ≥1 free public path that works **without a paid API key** (deterministic fixture simulating public RSS/trends is acceptable for GREEN prove; live scrape optional later).

### 2.2 Raw batch envelope

```ts
{
  schema_version: 1,
  kind: "growth.trend_raw_batch",
  sourceId: string,
  fetchedAt: string,          // ISO-8601
  items: Array<{
    externalId: string,
    title: string,
    query?: string,
    scoreHint?: number,       // source-native 0..1 if known
    tags?: string[],
    url?: string
  }>
}
```

---

## 3. Trend Normalizer (`d-b`)

Maps raw → unified `NormalizedTrend`:

```ts
{
  schema_version: 1,
  kind: "growth.normalized_trend",
  id: string,
  title: string,
  query: string,
  sourceId: string,
  unifiedScore: number,       // 0..1
  climeFit: number,           // 0..1 CLIME brand/topic fit heuristic
  formatTips: string[],       // e.g. "shorts", "threads", "card_news"
  keywords: string[],
  normalizedAt: string
}
```

Normalizer **must not** call paid APIs. Heuristics may be deterministic string/score rules for V1.

---

## 4. Keyword Graph (`d-b`)

### 4.1 Types (frozen set)

`Primary` | `Secondary` | `Long-tail` | `Question` | `Commercial` | `Evergreen` | `Seasonal` | `Trending`

### 4.2 Graph envelope

```ts
{
  schema_version: 1,
  kind: "growth.keyword_graph",
  projectId: string,
  updatedAt: string,
  nodes: Array<{
    id: string,
    label: string,
    type: KeywordType,
    score?: number
  }>,
  edges: Array<{
    from: string,
    to: string,
    relation: "related" | "expands" | "follows"
  }>
}
```

Persistence: `KnowledgeItem` with `namespace="growth"`, `type="keyword_graph"` (body = envelope). Research owns build; later `growth/knowledge` may façade-read — **Phase D does not add `packages/growth/knowledge`**.

---

## 5. Multi-Jack content hook (`d-b`, vg-a §2)

**Purpose:** Hand vg-c a normalized hot-topic seed. **Not** the variant pack.

```ts
{
  schema_version: 1,
  kind: "growth.multi_jack_content_hook",
  trendId: string,
  hotTopic: string,
  query: string,
  keywords: string[],
  formatTips: string[],       // hints only — vg-c chooses formats
  unifiedScore: number,
  climeFit: number,
  personaHints?: string[],    // optional; persona engine later
  paidApiRequired: false      // literal false — viral paid-API=0 lock
}
```

| Owner | Responsibility |
|---|---|
| `d-b` | Produce hook from NormalizedTrend |
| `vg-c` | Expand to meme / card-news / Shorts / Threads (min set) |
| Publish path | Validate required before post (constitutional; not D scope) |

---

## 6. Topic Generator (`d-c`) — home `growth/planning`

Mandatory path before body produce:

```text
Keyword/Graph (research inputs) → Topic (planning) → Title/Hook (content later)
```

### 6.1 Topic candidate envelope

```ts
{
  schema_version: 1,
  kind: "growth.topic_candidate",
  id: string,
  title: string,
  angle: string,
  primaryKeyword: string,
  supportingKeywords: string[],
  sourceTrendIds?: string[],
  missionId?: string | null,
  decisionId?: string | null,
  score: number,              // topic fitness, NOT daily Mission rank
  createdAt: string
}
```

### 6.2 Mission / Decision input pipe

`generateTopic` **must** accept (all optional except `projectId` + research grounding):

| Input | Role |
|---|---|
| `projectId` | Required |
| `missionId` / mission goal text | Ground topics to active Mission |
| `decisionId` / decision summary | Ground topics to Decision context (Phase E may supply real records; V1 accepts inline summary) |
| Keyword graph / trend ids | From research engine (injectable port) |

Topic Generator **reads** Mission/Decision context; it does **not** write `DecisionRecord` or enqueue Planner Queue as daily ranker.

---

## 7. Domain API (frozen channels — Growth namespace)

IPC: `domain:growth.<method>` + envelope `{ requestId, schema_version, traceId }` (S3A).

| Method | Kind | Owner package | Notes |
|---|---|---|---|
| `getKeywordGraph` | Q | research | Returns Keyword Graph envelope (empty OK) |
| `runResearchJob` | A | research | Ingest → normalize → update graph; returns `jobId` immediately; may complete sync in-process for V1 tests |
| `getNormalizedTrends` | Q | research | **NEW** — list recent NormalizedTrend |
| `buildMultiJackHook` | C | research | **NEW** — `{ trendId }` → Multi-Jack content hook seed |
| `generateTopic` | C | planning | **NEW** — Mission/Decision pipe → topic candidates |
| `getMissionToday` / `getDecision` / … | — | stubs until E/H | Unchanged ownership |

Long research work: `runResearchJob` returns AsyncJobAck (`jobId` + `traceId`); UI must not block.

---

## 8. Persistence (lean)

| Artifact | Store |
|---|---|
| Trend snapshots / NormalizedTrend list | `KnowledgeItem` `namespace=growth` `type=trend_snapshot` or `normalized_trends` |
| Keyword Graph | `KnowledgeItem` `namespace=growth` `type=keyword_graph` |
| Topic candidates (optional cache) | `KnowledgeItem` `namespace=growth` `type=topic_candidates` or return-only in V1 |

**No new SQLite tables** in Phase D.

---

## 9. Import DAG (frozen)

```text
@clime/growth-research  → @clime/shared, zod, @clime/storage (ports)
@clime/growth-planning  → @clime/shared, zod, @clime/storage (ports),
                          @clime/growth-research (types/ports for Keyword/Trend read ONLY)

apps/desktop main → wires growth research + planning handlers
Renderer          → DomainClient only

NO drizzle/sqlite · NO playwright · NO platform SDKs ·
NO @clime/content Topic ownership · NO packages/viral
```

Planning may depend on research **read ports** (graph/trends). Research must **not** import planning (cycle forbidden).

---

## 10. Feature keys (seed-compatible)

| Feature key | Gates |
|---|---|
| `feature.growth.getKeywordGraph` | Query graph |
| `feature.growth.runResearchJob` | Async research |
| `feature.growth.getNormalizedTrends` | Query trends |
| `feature.growth.buildMultiJackHook` | Multi-Jack seed |
| `feature.growth.generateTopic` | Topic Generator |

---

## 11. Prove checklist (`d-d`)

- [ ] Topic Generator lives only under `@clime/growth-planning` (0 Topic Generator files in research)
- [ ] Trend Source + Normalizer + Keyword Graph + Multi-Jack hook live under `@clime/growth-research`
- [ ] Growth packages present for D: **exactly** `research` + `planning` (no knowledge/decision/revenue scaffolding required; no viral god-package)
- [ ] `buildMultiJackHook` returns `paidApiRequired: false` and `kind: growth.multi_jack_content_hook`
- [ ] `runResearchJob` works without paid API key (≥1 free source path)
- [ ] `generateTopic` accepts Mission/Decision inputs and returns `schema_version` topic candidates
- [ ] Prisma / Supabase / Playwright / vendor SDK deps = 0 in both packages
- [ ] Research ↛ planning import; planning may → research
- [ ] `pnpm lint` / `typecheck` / `test` GREEN

---

## 12. Explicit non-goals (out of Phase D)

- Competitor / Gap / Opportunity / Viral / AI Researcher depth (Phase G)
- Decision Engine daily mix (Phase E)
- Multi-Jack multi-format variant pack (`vg-c`)
- Micro-Audit PDF / `.clime` / 7-channel Repurposer (other todos)
- `packages/growth/knowledge` façade package
- Live paid trend APIs
- New first-class DB tables
- Persona/Emotion full engines (prefs UI = K1; engine later under research)

---

## 13. Handoff

| Part | Model | Deliverable |
|---|---|---|
| `d-a` | GROK4.5 | **This contract FROZEN** |
| `d-b` | COMPOSER2.5 | Trend Source + Normalizer + Keyword Graph + Multi-Jack content hook |
| `d-c` | COMPOSER2.5 | Topic Generator + Mission/Decision input pipe |
| `d-d` | GROK4.5 | Prove doc + GREEN gates |

**Do not** put Topic Generator in research. **Do not** implement vg-c variants in `d-b`.
