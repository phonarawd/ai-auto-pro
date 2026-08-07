# E-A Revenue + Decision Ownership Contract (FROZEN)

**Status:** FROZEN — plan to-do `e-a` (GROK4.5/256K); **Prove** in `e-d`  
**Normative for:** `e-b` (revenue Prioritizer + 추정 라벨) / `e-c` (Decision Graph → Mission Center + Queue producer) — implement **this file only**; no scope explosion  
**SSOT parents:** [`06_GROWTH.md`](../architecture/06_GROWTH.md), [`03_ENGINES.md`](../architecture/03_ENGINES.md), [`05_WORKFLOW.md`](../architecture/05_WORKFLOW.md), [`02_CONSTITUTION.md`](../architecture/02_CONSTITUTION.md), [`14_DATABASE.md`](../architecture/14_DATABASE.md), [`S3A_DOMAIN_API_CONTRACT.md`](S3A_DOMAIN_API_CONTRACT.md), [`S8A_MISSION_CENTER_CONTRACT.md`](S8A_MISSION_CENTER_CONTRACT.md), [`DA_RESEARCH_TOPIC_CONTRACT.md`](DA_RESEARCH_TOPIC_CONTRACT.md)

---

## 0. Locks & Invariants (non-negotiable)

| Lock | Rule |
|---|---|
| **Daily = Decision only** | **Only** `@clime/growth-decision` emits today’s Mission priority + production mix. Planner / Recommendation / Topic Generator / Revenue / Executive / Meta **must not** invent competing daily rankings |
| **Executive 미간섭** | Executive / Meta own week/month/quarter envelopes only. They **must not** write `DecisionRecord`, rank daily Missions, or enqueue Planner Queue as a daily arbiter. Horizon constraints may be **inputs** to Decision; never a second daily emitter |
| **Decision Graph explain** | Every daily Decision persists a Decision Graph (`graphJson` Option A) + narrative. Mission Center “Why Today” reads explain via Domain API (`growth.getMissionToday.decisionExplain` / `growth.explainDecision`) |
| **Decision → Planner Queue** | Decision output enters Planner Queue **only** through the Growth/planning **Queue producer**. Path: Decision → `enqueueFromDecision` (planning) → `PlannerQueueItem`. **Workers 직행 0** — Decision must never lease queue items, invoke Worker Runtime, or advance Workflow SM past enqueue |
| **추정 라벨** | All Revenue Prioritizer / ROI / forecast numeric outputs that are not measured facts **must** carry `isEstimate: true` and `estimateLabel: "추정"` (literal). UI/API must not present unlabeled “predicted revenue” as fact |
| **Growth umbrellas** | Phase E adds **only** `revenue` + `decision` under `packages/growth/`. No Ads OS, no Forecast UI god-package, no Meta Executive package in this slice |
| **No AI vendor SDK** | Call AI only via optional `@clime/ai` port if needed; V1 MVP may be deterministic. OpenAI/Gemini/… SDKs never in these packages |
| **Repository only** | Persist via `@clime/storage` ports (`DecisionRepository`, `MissionRepository`, `PlannerQueueRepository`) — no Drizzle/SQLite imports in growth engines |
| **Schema versioning** | Revenue estimate, Prioritizer result, Decision Graph, Mission payload, Queue payload: Zod + required `schema_version` |
| **UI → Domain API** | Renderer never imports `@clime/growth-*`; channels stay `domain:growth.*` |

**Forbidden (merge blockers):** Executive daily ranker · Decision→Worker/Workflow direct run · unlabeled revenue estimates · Topic Generator as daily arbiter · Prisma/Supabase · vendor SDKs in growth · Paid Ads spend automation (HumanGate only, out of E) · new first-class tables beyond existing `DecisionRecord` / `Mission` / `PlannerQueueItem`

---

## 1. Package ownership

| Package | Owns | Does **not** own |
|---|---|---|
| **`@clime/growth-revenue`** (`packages/growth/revenue`) | Revenue Prioritizer; revenue estimate envelopes with 추정 라벨; GrowthAPI `estimateRevenue` / `prioritizeRevenue` | Daily Mission rank; Decision Graph write; Planner Queue enqueue; Executive horizons; Analytics Funnel store |
| **`@clime/growth-decision`** (`packages/growth/decision`) | Decision Engine (daily); Decision Graph build/persist; Mission “today” materialization; `getMissionToday` / `getDecision` / `explainDecision` / `runDailyDecision`; calls planning Queue producer | Worker Runtime; Workflow SM advance; Executive reallocations; Topic Generator; Trend Source |
| **`@clime/growth-planning`** | **Queue producer** `enqueueFromDecision` (from Decision output); existing Topic Generator | Daily priority emission; Worker consume |
| **`@clime/storage`** | Existing `DecisionRecord` (+ `graphJson`), `Mission`, `PlannerQueueItem` — **no new tables** in Phase E | Scoring semantics |
| **`@clime/domain-api`** | Channel registry + client types for new/owned growth methods | Engine logic |
| **`@clime/meta` / Executive** | Week/month/quarter only (Phase J) — **not** implemented as daily in E | Daily Decision |

```text
UI → domain:growth.*
  → RevenuePrioritizer (e-b)
      candidates → ranked estimates (isEstimate + estimateLabel="추정")
  → DecisionEngine (e-c)
      (research/topic inputs optional) + Prioritizer → DecisionRecord + Graph
      → Mission(s) for today
      → planning.enqueueFromDecision → PlannerQueueItem[]
  → Mission Center reads getMissionToday (missions + decisionExplain + queueDepth)
  → START remains automation.startMission → Queue (B3) — Workers never from Decision
```

---

## 2. Revenue Prioritizer (`e-b`)

### 2.1 Ranking path (frozen)

Ranks by expected CLIME money path — **not** vanity volume:

```text
content → signup → investment → revenue / ROI
```

### 2.2 Revenue estimate envelope

```ts
{
  schema_version: 1,
  kind: "growth.revenue_estimate",
  id: string,
  candidateId: string,
  title: string,
  expectedSignups: number,
  expectedInvest: number,
  expectedRevenue: number,
  expectedRoi: number,          // relative score hint, still an estimate
  confidence: number,           // 0..1
  assumptionsVersion: string,   // e.g. "v1_heuristic"
  isEstimate: true,             // literal true — required
  estimateLabel: "추정",        // literal — required for UI honesty
  createdAt: string             // ISO-8601
}
```

**Merge blocker:** any Prioritizer output omitting `isEstimate: true` or `estimateLabel: "추정"`.

### 2.3 Prioritizer result envelope

```ts
{
  schema_version: 1,
  kind: "growth.revenue_prioritizer_result",
  projectId: string,
  ranked: Array<{
    rank: number,               // 1..N
    candidateId: string,
    score: number,              // 0..1 prioritizer score
    estimate: /* revenue_estimate */
  }>,
  isEstimate: true,
  estimateLabel: "추정",
  rankedAt: string
}
```

### 2.4 Candidate input (V1 MVP)

```ts
{
  candidateId: string,
  title: string,
  formatHint?: string,          // e.g. "shorts", "blog", "reels"
  climeFit?: number,            // 0..1 optional from research
  unifiedScore?: number         // 0..1 optional from trend/topic
}
```

V1 MVP may use deterministic heuristics (no AI). No paid Ads spend path.

---

## 3. Decision Engine (`e-c`)

### 3.1 Sole daily arbiter

Merges (V1 MVP may use subsets with fixtures):

- Revenue Prioritizer ranked estimates
- Optional Keyword / Trend / Topic context (from research/planning read ports)
- Optional Executive horizon constraints (pass-through input only — Decision still emits daily)

→ **today’s ordered Mission Priority + production mix**.

### 3.2 Decision Graph envelope (`graphJson`)

Persisted on `DecisionRecord.graphJson` (V1 Option A — no edge table):

```ts
{
  schema_version: 1,
  kind: "growth.decision_graph",
  decisionId: string,
  decidedAt: string,
  productionMix: {
    shorts?: number,
    reels?: number,
    blogs?: number,
    threads?: number
  },
  nodes: Array<{
    id: string,
    type: "Trend" | "Keyword" | "RevenueEstimate" | "Decision" | "Mission" | "PlannerQueueItem",
    label: string
  }>,
  edges: Array<{
    from: string,
    to: string,
    relation: "feeds" | "ranks" | "decides" | "enqueues"
  }>,
  narrative: string,            // human "Why Today"
  estimateLabel: "추정"         // when graph cites revenue numbers
}
```

Canonical edge story (must be representable):

```text
Trend → Keyword → RevenueEstimate → Decision → Mission → PlannerQueueItem
```

### 3.3 Outputs of `runDailyDecision`

| Output | Store / channel |
|---|---|
| `DecisionRecord` | `decisions.create` + `graphJson` + `narrative` |
| Mission(s) for `missionDate=today` | `missions.create` with `decisionId`, priority order |
| Planner Queue items | **only** via `planning.enqueueFromDecision` |
| Domain explain | `narrative` / graph → `getMissionToday.decisionExplain` |

### 3.4 Queue producer contract (planning)

```ts
enqueueFromDecision({
  projectId,
  decisionId,
  missionId,
  items: Array<{
    priority: number,
    expectedRoi?: number,       // estimate — payload must keep 추정 honesty
    payload: { schema_version, kind, ... }
  }>
}) → { queueItemIds: string[] }
```

- Enqueued `PlannerQueueItem.status` = `ready` (Workers pull later via Automation — not Decision)
- Payload `schema_version` required
- `decisionId` + `missionId` required on items
- Decision package **must not** call `plannerQueue.lease` / Worker APIs

---

## 4. Mission Center connection (`e-c`)

### 4.1 `getMissionToday` response (owned by decision)

```ts
{
  schema_version: 1,
  missions: Array<{
    id: string,
    title: string,
    description?: string,
    summary?: string,
    status: string,
    priority: number,
    decisionId?: string | null
  }>,
  decisionExplain?: string,     // Why Today — Zone E
  decisionId?: string | null,
  queueDepth: number,
  estimateLabel?: "추정",       // when explaining cites estimates
  productionMix?: Record<string, number>
}
```

### 4.2 UI wiring rules

| Surface | Source |
|---|---|
| Zone B mission line | `missions[0]` title / summary |
| Zone E “Decision Graph (Why Today)” | `decisionExplain` (fallback: mission.summary) |
| START CTA | Still `automation.startMission` → Planner Queue (B3) — **unchanged** |

Renderer remains DomainClient-only.

---

## 5. Domain API (frozen channels — Growth namespace)

IPC: `domain:growth.<method>` + envelope `{ requestId, schema_version, traceId }` (S3A).

| Method | Kind | Owner package | Notes |
|---|---|---|---|
| `estimateRevenue` | C | revenue | **NEW** — candidates → estimate envelopes (추정) |
| `prioritizeRevenue` | C | revenue | **NEW** — ranked Prioritizer result (추정) |
| `runDailyDecision` | C | decision | **NEW** — emit daily Decision + Missions + Queue via planning producer |
| `getMissionToday` | Q | decision | **OWN** — replaces stub; missions + decisionExplain + queueDepth |
| `getDecision` | Q | decision | **OWN** — latest / by id Decision + graph |
| `explainDecision` | Q | decision | **OWN** — narrative + graph summary (Executive may later mirror; Growth owns daily explain) |
| `listPlannerQueue` | Q | decision | **OWN** — read-only queue view for project |
| research / topic methods | — | research / planning | Unchanged |

`executive.explainDecision` remains Executive-horizon stub until Phase J — **must not** become the daily SSOT in E.

---

## 6. Persistence (lean)

| Artifact | Store |
|---|---|
| Decision Graph + narrative | `DecisionRecord.graphJson` + `narrative` |
| Today Mission | `Mission` (`missionDate`, `decisionId`, `payloadJson`) |
| Queue buffer | `PlannerQueueItem` via planning producer |
| Revenue estimates (optional cache) | Return-only in V1 **or** Mission/Decision payload JSON — **no new table** |

**No new SQLite tables** in Phase E.

---

## 7. Import DAG (frozen)

```text
@clime/growth-revenue   → @clime/shared, zod, (@clime/storage ports optional)
@clime/growth-decision  → @clime/shared, zod, @clime/storage (ports),
                          @clime/growth-revenue,
                          @clime/growth-planning (queue producer ONLY),
                          @clime/growth-research (read ports optional)

@clime/growth-planning  → (+ enqueueFromDecision); must NOT import decision (cycle forbidden)
@clime/growth-revenue   → must NOT import decision
@clime/growth-decision  → must NOT import @clime/automation worker internals / workflow runner

apps/desktop main → wires revenue + decision handlers (override stubs)
Renderer          → DomainClient only

NO drizzle/sqlite · NO playwright · NO platform SDKs ·
NO Executive daily writer · NO Decision→Worker bypass
```

---

## 8. Feature keys (seed-compatible)

| Feature key | Gates |
|---|---|
| `feature.growth.estimateRevenue` | Revenue estimate |
| `feature.growth.prioritizeRevenue` | Prioritizer |
| `feature.growth.runDailyDecision` | Daily Decision emit |
| `feature.growth.getMissionToday` | Mission Center today (existing) |
| `feature.growth.getDecision` | Decision query (existing) |
| `feature.growth.explainDecision` | Explain (existing) |
| `feature.growth.listPlannerQueue` | Queue view (existing) |

---

## 9. Prove checklist (`e-d`)

- [ ] Daily priority emitter lives **only** under `@clime/growth-decision` (`runDailyDecision`)
- [ ] Executive / Meta paths do **not** write daily `DecisionRecord` or daily Mission rank in Phase E
- [ ] Revenue Prioritizer outputs always include `isEstimate: true` + `estimateLabel: "추정"`
- [ ] Decision Graph persisted on `DecisionRecord.graphJson` with `kind: growth.decision_graph`
- [ ] `runDailyDecision` enqueues Planner Queue **via** `planning.enqueueFromDecision` (queue item ids > 0)
- [ ] Decision package never calls Worker lease / Workflow run-as-worker
- [ ] `getMissionToday` returns missions + `decisionExplain` linked to Decision Graph narrative
- [ ] Mission Center Zone E can display Decision explain (Domain API path)
- [ ] Growth packages for E: `research` + `planning` + `decision` + `revenue` (no viral god-package)
- [ ] Prisma / Supabase / Playwright / vendor SDK deps = 0 in revenue + decision
- [ ] `pnpm lint` / `typecheck` / `test` GREEN

---

## 10. Explicit non-goals (out of Phase E)

- Meta Executive package / Dashboard (Phase J)
- Planner Queue producer polish / Scheduler intelligence (Phase H depth)
- Paid Ads OS / spend automation
- Analytics Funnel persistence / Experiment A/B
- Learning / ROI→Policy loop (Phase I)
- Competitor/Gap/Viral research depth (Phase G)
- New first-class DB tables
- Live paid attribution APIs

---

## 11. Handoff

| Part | Model | Deliverable |
|---|---|---|
| `e-a` | GROK4.5 | **This contract FROZEN** |
| `e-b` | COMPOSER2.5 | Revenue Prioritizer + 추정 라벨 path |
| `e-c` | COMPOSER2.5 | Decision Graph → Mission Center + Queue producer wiring |
| `e-d` | GROK4.5 | Prove doc + GREEN gates |

**Do not** let Executive emit daily. **Do not** let Decision invoke Workers. **Do not** ship unlabeled revenue estimates.
