# J-A Executive (Meta Slim) Ownership Contract (FROZEN)

**Status:** FROZEN — plan to-do `j-a` (GROK4.5/256K); **Prove** in `j-c`  
**Normative for:** `j-b` (`packages/meta` Executive+Goal + Executive Dashboard UI) — implement **this file only**; no scope explosion  
**SSOT parents:** [`03_ENGINES.md`](../architecture/03_ENGINES.md), [`02_CONSTITUTION.md`](../architecture/02_CONSTITUTION.md), [`06_GROWTH.md`](../architecture/06_GROWTH.md), [`05_WORKFLOW.md`](../architecture/05_WORKFLOW.md), [`15_DESKTOP_AND_ROADMAP.md`](../architecture/15_DESKTOP_AND_ROADMAP.md), [`14_DATABASE.md`](../architecture/14_DATABASE.md), [`S3A_DOMAIN_API_CONTRACT.md`](S3A_DOMAIN_API_CONTRACT.md), [`EA_REVENUE_DECISION_CONTRACT.md`](EA_REVENUE_DECISION_CONTRACT.md), [`IA_LEARNING_MEMORY_ROI_CONTRACT.md`](IA_LEARNING_MEMORY_ROI_CONTRACT.md), [`16_DESIGN_SYSTEM.md`](../architecture/16_DESIGN_SYSTEM.md)

---

## 0. Locks & Invariants (non-negotiable)

| Lock | Rule |
|---|---|
| **Meta slim** | `@clime/meta` owns **Executive + Goal only**. **Must not** own Reflection, Cost Intelligence, Learning policies, Memory episodes, daily Decision, or strategy playbooks |
| **Horizons only** | Executive envelopes are **`week` / `month` / `quarter` only** (`goalHorizonSchema`). No `day` horizon. No daily Mission ranking |
| **Daily = Decision only** | **Only** `@clime/growth-decision` emits today’s Mission priority + production mix. Meta / Executive **must not** call `runDailyDecision`, write `DecisionRecord`, rank daily Missions, or enqueue Planner Queue |
| **Goal→KPI→Mission** | Goal Manager owns the chain Goal → KPI → linked Mission **templates/refs**. Linking stores refs on the Goal; it **does not** invent competing daily ranks or start Workers |
| **Horizon constraints as inputs** | Envelopes / mix caps may be exposed as **read-only constraints** (e.g. `horizonHint` for Decision). They are never a second daily emitter |
| **Repository only** | Persist Goals via `@clime/storage` `goals` port — no Drizzle/SQLite imports in `@clime/meta` |
| **Schema versioning** | Goal KPI JSON, horizon envelope, reallocation recommendation, Executive explain: Zod + required `schema_version` |
| **UI → Domain API** | Renderer never imports `@clime/meta`; channels stay `domain:executive.*` |
| **No AI vendor SDK** | V1 MVP is deterministic. Vendor SDKs never in `@clime/meta` |
| **No new tables** | Use existing first-class `Goal` table only. No Prisma / Supabase |

**Forbidden (merge blockers):** Executive daily ranker · Meta writing `DecisionRecord` · Meta calling `plannerQueue` / `enqueueFromDecision` / `automation.startMission` · Meta owning Reflection/Cost/Learning · `day` horizon · vanity KPI collage on Mission Center home · Paid Ads spend automation

---

## 1. Package ownership

| Package | Owns | Does **not** own |
|---|---|---|
| **`@clime/meta`** (`packages/meta`) | Executive AI (week/month/quarter envelopes + reallocations); Goal Manager (Goal→KPI→Mission link); ExecutiveAPI handlers | Daily Decision; Planner Queue; Workers; Reflection; Cost; Learning; Memory; Content Validate |
| **`@clime/growth-decision`** | Daily Mission priority + mix; Decision Graph | Horizon Goal writes; Executive reallocations |
| **`@clime/learning`** | Reflection + Confidence + ROI→Policy | Goals / Executive envelopes |
| **`@clime/ai`** | Cost Intelligence | Meta |
| **`@clime/storage`** | Existing `Goal` (+ `kpiJson`) — **no new tables** in Phase J | Scoring semantics |
| **`@clime/domain-api`** | Channel registry + client types for `executive.*` | Engine logic |
| **`@clime/desktop` renderer** | Executive Dashboard surface (Domain API client only) | Engine imports |

```text
UI → domain:executive.*
  → GoalManager
      setGoal / getGoals / linkMission (Goal→KPI→Mission refs)
  → ExecutiveEngine
      getHorizon (envelope + mix caps + goals)
      getReallocations (horizon recommendations; 추정 when estimate)
      explainDecision (Executive Dashboard narrative — horizon context)
  → Decision Engine (separate) may READ horizon constraints as horizonHint
  → NEVER: runDailyDecision · decisions.create · plannerQueue · startMission
```

---

## 2. Horizons & envelopes (frozen)

### 2.1 Horizon enum

```ts
type GoalHorizon = "week" | "month" | "quarter"; // shared goalHorizonSchema
```

### 2.2 Production mix envelope (inside Goal `kpiJson.data`)

```ts
{
  schema_version: 1,
  data: {
    kind: "meta.goal_kpi",
    target?: number,                    // primary numeric target (optional)
    theme?: string,                     // e.g. "organic reels focus"
    kpis: Array<{
      key: string,                      // e.g. "signups", "reels_count"
      target: number,
      unit?: string,                    // e.g. "count", "krw"
      current?: number                  // optional measured rollup
    }>,
    mixCaps?: Record<string, number>,   // e.g. { reels: 20, blogs: 5, shorts: 15 }
    missionLinks: Array<{
      missionId: string,
      title?: string,
      linkedAt: string                  // ISO-8601
    }>,
    notes?: string
  }
}
```

**Storage rule:** `Goal.kpiJson` MUST satisfy storage `jsonDocumentEnvelopeSchema` (`schema_version` + optional `data` record). Rich KPI payload lives under `data`.

### 2.3 Goal row fields (existing table)

| Column | Rule |
|---|---|
| `horizon` | `week` \| `month` \| `quarter` only |
| `title` | Human-readable goal name |
| `kpiJson` | Envelope above |
| `status` | `active` \| `paused` \| `done` \| `archived` |

---

## 3. Goal Manager — Goal→KPI→Mission

### 3.1 Chain meaning (V1)

```text
Goal (horizon)
  → KPI list (targets / units)
  → missionLinks[] (Mission id refs — templates or historical missions)
```

- **Does:** upsert Goal, attach/detach Mission refs, expose chain for Dashboard.
- **Does not:** set daily Mission `priority`, write `decisionId`, enqueue Planner Queue, or invoke Workers.

### 3.2 APIs (engine)

| Method | Effect |
|---|---|
| `setGoal` | Upsert Goal + KPI envelope for a horizon |
| `getGoals` | List by project (+ optional horizon filter) |
| `linkMission` | Append `missionLinks` entry on Goal |
| `unlinkMission` | Remove mission link |
| `getGoalChain` | Return Goal + KPIs + missionLinks (read model) |

---

## 4. Executive Engine — horizons & reallocations

### 4.1 `getHorizon`

Returns envelope status for one horizon:

```ts
{
  schema_version: 1,
  kind: "meta.horizon_status",
  projectId: string,
  horizon: "week" | "month" | "quarter",
  status: "active" | "empty" | "paused",
  theme?: string,
  mixCaps: Record<string, number>,
  goals: /* Goal view[] */,
  constraintHint: string,   // safe string for Decision horizonHint
  narrative: string
}
```

### 4.2 `getReallocations`

Horizon reallocation recommendations (Executive Dashboard):

```ts
{
  schema_version: 1,
  kind: "meta.reallocation_list",
  projectId: string,
  horizon: "week" | "month" | "quarter",
  items: Array<{
    id: string,
    summary: string,          // e.g. "ROI +18% → more reels / fewer blogs"
    fromFormat?: string,
    toFormat?: string,
    deltaHint?: number,
    isEstimate: boolean,
    estimateLabel?: "추정",   // required when isEstimate === true
    rationale: string
  }>
}
```

V1 may be deterministic from mixCaps + optional ROI format hints. Estimated numeric claims **must** set `isEstimate: true` + `estimateLabel: "추정"`.

### 4.3 `explainDecision` (Executive namespace)

Horizon-context narrative for the Dashboard (may summarize latest Decision Graph **read-only** if `decisionId` provided). **Must not** persist a new `DecisionRecord` or change daily rank.

```ts
{
  schema_version: 1,
  kind: "meta.executive_explain",
  decisionId?: string,
  narrative: string,
  graph?: { nodes: unknown[], edges: unknown[] } | null,
  horizonNote: string   // asserts Executive does not rank today
}
```

---

## 5. Domain API (`executive` namespace) — frozen map

| Method | Kind | Purpose |
|---|---|---|
| `getGoals` | [Q] | Goal + KPI by horizon |
| `setGoal` | [C] | Upsert goal envelope |
| `getHorizon` | [Q] | Horizon envelope status |
| `explainDecision` | [Q] | Decision graph / narrative for Executive Dashboard |
| `getReallocations` | [Q] | Reallocation recommendations |
| `linkMission` | [C] | Goal→Mission link (chain) |
| `getGoalChain` | [Q] | Goal→KPI→Mission read model |

**Daily queue lock:** none of these methods may mutate Planner Queue, daily Decision rank, or Worker leases.

IPC channels: `domain:executive.<method>`.

### 5.1 Client arg shapes (normative for `j-b`)

```ts
getGoals: { projectId?: string; horizon?: "week"|"month"|"quarter" }
setGoal: {
  projectId?: string;
  goalId?: string;
  horizon: "week"|"month"|"quarter";
  title: string;                 // replaces stub `name`
  target?: number;
  theme?: string;
  kpis?: Array<{ key: string; target: number; unit?: string; current?: number }>;
  mixCaps?: Record<string, number>;
  status?: "active"|"paused"|"done"|"archived";
}
getHorizon: { projectId?: string; horizon?: "week"|"month"|"quarter" }
explainDecision: { projectId?: string; decisionId?: string }
getReallocations: { projectId?: string; horizon?: "week"|"month"|"quarter" }
linkMission: { goalId: string; missionId: string; title?: string }
getGoalChain: { goalId: string }
```

Feature keys (existing seed-compatible): `feature.executive.getGoals` · `setGoal` · `getHorizon` · `explainDecision` · `getReallocations`.  
Additional (j-b may register): `feature.executive.linkMission` · `feature.executive.getGoalChain`.

---

## 6. Executive Dashboard UI (`j-b`)

### 6.1 Surface rules

| Rule | Detail |
|---|---|
| **Not home** | Mission Center remains the first viewport / home. Executive Dashboard is a **secondary surface** (panel or route opened from header / Quick Actions) |
| **One job** | Show week/month/quarter envelopes, Goal→KPI→Mission chain, reallocation recommendations |
| **No daily micro-manage** | No START / Planner Queue depth controls / daily Mission reorder on this surface |
| **Honest estimates** | Reallocation numbers labeled **추정** when `isEstimate` |
| **Domain API only** | `window.domainClient.executive.*` — zero `@clime/meta` / engine / ORM imports in renderer |
| **Design tokens** | Pretendard + `--clime-*` only; no vanity marketing KPI collage; Card only if interaction container |

### 6.2 UX Acceptance Gate (Executive surface + Mission Center non-regression)

- [ ] Mission Center first viewport still brand + CTA + status board (no Executive vanity strip injected into home hero)
- [ ] Executive Dashboard reachable without replacing Mission Center home
- [ ] Horizons shown are week/month/quarter only
- [ ] Reallocations show 추정 when estimated
- [ ] No daily queue mutate controls on Executive surface
- [ ] Trace / errors honest if Domain API fails
- [ ] Renderer Domain API path only
- [ ] Pretendard + `--clime-*` tokens

---

## 7. Import DAG (frozen)

```text
@clime/meta  → @clime/shared, zod, @clime/storage (goals + optional decisions READ for explain)

@clime/meta  MUST NOT import:
  @clime/growth-decision (write path) · @clime/automation · @clime/workflow
  @clime/learning · @clime/ai · drizzle-orm · better-sqlite3 · playwright · vendor SDKs

apps/desktop main → wires createExecutiveDomainHandlers (override stubs)
Renderer          → DomainClient only

NO Executive daily writer · NO Meta Reflection/Cost · NO new SQLite tables
```

Optional **read-only** `decisions.getById` for `explainDecision` is allowed; **writes** to `decisions` / `missions` (priority) / `plannerQueue` are forbidden.

---

## 8. Prove checklist (`j-c`)

- [ ] Daily priority emitter remains **only** `@clime/growth-decision` (`runDailyDecision`)
- [ ] `@clime/meta` paths do **not** write `DecisionRecord`, call `runDailyDecision`, or enqueue Planner Queue
- [ ] Meta package exports Executive + Goal only (no Reflection / Cost modules)
- [ ] Goals persist with horizons `week`/`month`/`quarter` only; Goal→KPI→Mission links work
- [ ] `getHorizon` / `getReallocations` / `explainDecision` return `schema_version` envelopes
- [ ] Estimated reallocations carry `isEstimate` + `estimateLabel: "추정"`
- [ ] Domain API `executive.*` wired in desktop host (overrides stubs)
- [ ] Executive Dashboard UI + UX Gate items above
- [ ] Prisma / Supabase / Playwright / vendor SDK deps = 0 in `@clime/meta`
- [ ] `pnpm lint` / `typecheck` / `test` GREEN

---

## 9. Explicit non-goals (out of Phase J)

- AI CEO paid+organic portfolio (L+)
- Paid Ads OS / spend automation (HumanGate only elsewhere)
- Settings Global→Project→User polish (K1)
- electron-builder / `.exe` (K2)
- New first-class DB tables
- Meta taking Cost Intelligence or Reflection back
- Replacing Mission Center home with Executive Dashboard

---

## 10. Handoff

| Part | Model | Deliverable |
|---|---|---|
| `j-a` | GROK4.5 | **This contract FROZEN** |
| `j-b` | COMPOSER2.5 | `packages/meta` + Executive Dashboard UI + Domain API wiring |
| `j-c` | GROK4.5 | Prove doc + GREEN gates (daily=Decision only · Meta slim · UX Gate) |

**Do not** let Executive emit daily. **Do not** let Meta own Reflection/Cost. **Do not** inject vanity KPI collage into Mission Center home.
