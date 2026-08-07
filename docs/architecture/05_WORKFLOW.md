# 05 — Workflow: DSL, Agent Loop, Planner Queue

**Status:** Phase 0 RFC
**Constitutional link:** Everything is a Workflow · Task State Machine

---

## 1. Role split

| Package | Role |
|---|---|
| **Workflow Engine** | JSON/YAML DSL definitions, templates, run graph, resume |
| **Automation Engine** | Planner Queue → Worker Runtime + Resource Scheduler |
| **Growth/planning** | Produces Planner Queue items from Decision |
| **Governor (Runtime)** | Admission control for workers |

```text
Executive (horizon)
  → Decision Engine (daily)
    → Planner Queue
      → Workflow DSL run
        → Worker Runtime (1..N)
```

---

## 2. Agent Loop (product heart)

```text
Observe → Research → Analyze → Predict
  → Plan (Executive horizon → Decision daily → Planner Queue → Workflow)
  → Generate → Validate → Optimize → Publish (+ Export backup)
  → Measure → Learn (confidence) → Reflect → Policy Update → Repeat
```

**Validate** (required): brand/forbidden/format/schema checks before Optimize/Publish. Owned by Content Quality + Brand rules — not Executive.

Mission Center **START** runs an Agent Loop slice as a Workflow; auto-publish proceeds per Matrix (`canPublish` + `publishMode`); challenge → `PAUSED_CHALLENGE` + Inbox.

---

## 3. Task state machine

### Happy path

```text
QUEUED → RUNNING → VALIDATING → OPTIMIZING → READY → PUBLISHED
```

### Terminals & blocks

| State | Meaning |
|---|---|
| `FAILED` | Unrecoverable after retries |
| `CANCELLED` | User or Kill Switch |
| `BLOCKED_HUMAN` | Awaiting review/approval (Policy / high `riskLevel` / Paid spend) |
| `BLOCKED_CAPABILITY` | Matrix denies publish/action |
| `BLOCKED_POLICY` | Feature/Policy/Governor denial |
| `PAUSED_CHALLENGE` | Captcha/challenge/lock detected — auto-pause + Inbox |

### Notes

- `PUBLISHED` means live post via `publishMode: api|session`; Export backup is recorded in parallel.
- `VALIDATING` failure may return to Generate or `FAILED` based on policy.
- Every transition emits a Domain Event with `schema_version` + Trace ID.

---

## 4. Workflow DSL

### 4.1 Principles

- Versioned JSON/YAML documents with `schema_version`
- Adding a workflow = add DSL + register template — **not** a core fork
- Nodes map to engine ports (Growth/Content/AI/Account/Analytics/…)
- Resumable: persist node cursors + artifact refs

### 4.2 Example — Daily Growth (illustrative)

**Required shape (V1):** every Daily Growth template includes a **`publish` node** (live post via Matrix) and an **`export` node** (Export backup log). Export is parallel backup — never the sole success path when `canPublish`.

```yaml
schema_version: "1"
id: daily-growth
name: Daily Growth
nodes:
  - id: research_keywords
    type: growth.research.keyword_pass
  - id: decide
    type: growth.decision.emit_daily
  - id: enqueue
    type: automation.planner.enqueue_from_decision
  - id: generate
    type: content.generate
  - id: validate
    type: content.validate
  - id: optimize
    type: content.optimize
  - id: review_gate
    type: human.review
  - id: publish
    type: account.publish   # REQUIRED — Matrix canPublish + publishMode api|session
  - id: export
    type: content.export    # REQUIRED — parallel backup log (not sole success path)
  - id: measure
    type: analytics.ingest_snapshot
  - id: learn
    type: learning.propose_from_roi   # REQUIRED — measure → learn (V1 DoD / constitution §2.5)
edges:
  - [research_keywords, decide]
  - [decide, enqueue]
  - [enqueue, generate]
  - [generate, validate]
  - [validate, optimize]
  - [optimize, review_gate]
  - [review_gate, publish]
  - [review_gate, export]   # Export backup may fan out in parallel with publish
  - [publish, measure]
  - [export, measure]
  - [measure, learn]
```

- **`publish` is mandatory** in the Daily Growth DSL (Phase C2 / B3 implementations must not drop it).
- **Export backup** runs as a sibling path (parallel or immediately after); success of Export alone does not satisfy auto-publish when Matrix allows.
- **`learn` is mandatory** after measure (ROI → Learning policy proposal; Confidence gate applies).
- challenge → `PAUSED_CHALLENGE` (never silent `posted_*`).
Concrete schema lands in implementation; this RFC locks the shape.

### 4.3 Node categories

| Category | Examples |
|---|---|
| Growth | research, decide, revenue.estimate |
| Content | generate, validate, optimize, repurpose, export |
| Account | resolve_targets, capability_check, **publish** |
| Analytics | measure, experiment.assign |
| Learning | **propose_from_roi**, run_reflection |
| Human | review, approve_spend |
| System | notify, sleep, gate_feature |

---

## 5. Planner Queue

### 5.1 Why

Buffers Decision output so Workers never see a 40-job simultaneous stampede. Executive may set “this week: 20 reels / 5 blogs / 15 shorts”; Decision emits today’s ordered work; Queue paces execution.

### 5.2 Item fields

| Field | Purpose |
|---|---|
| `priority` | Ordering |
| `deadline` | SLA / morning batch |
| `expectedRoi` | Scheduling hint |
| `dependencyIds` | Graph wait |
| `retry` | Policy-bound |
| `humanApproval` | Gate flag |
| `decisionId` | Decision Graph link |
| `missionId` | Mission Center |
| `payload` | Typed work descriptor + `schema_version` |

### 5.3 Producer / consumer

- **Producer:** Growth/planning (from Decision Engine output)
- **Consumer:** Automation Worker Runtime (pull under Governor)
- **UI:** Queue / Calendar views via Domain API only

---

## 6. Mission Templates & Triggers

### Templates (Growth)

Examples: `SNS Growth` · `SEO Growth` · `Referral` · `Investment` — instantiate daily/weekly missions from Strategy (Knowledge `strategy` + Goal chain).

### Triggers (Automation)

| Kind | Example |
|---|---|
| Time | 09:00 DailyGrowth |
| Event | `KeywordDiscovered` → enqueue generate |
| Threshold | `ReelViews >= 300000` → similar-content proposal |

---

## 7. Worker Runtime

```text
Queue item → lease → run Workflow node(s) → checkpoint → complete/fail
```

- Async, resumable, Trace ID on every hop
- Engines talk via Commands/Events only
- Resource Scheduler admits jobs by CPU/RAM/GPU/VRAM/token budgets
- Notifications = infra; Observability wraps every run

---

## 8. Human gates

| Gate | When |
|---|---|
| Review before publish | When Policy / `riskLevel` requires (not a blanket block on auto-publish) |
| Approve spend | Always for Paid Ads / costly experiments (HumanGate) |
| Aggressive Learning rules | User confirm before Memory write |

`BLOCKED_HUMAN` is first-class — not an error.

---

## 9. Decision Graph linkage

Each WorkflowRun should reference:

```text
decisionId → missionId → plannerQueueItemId → workflowRunId → contentIds → roiSnapshotId
```

Powers Mission Center “why” and Executive Dashboard narratives (`ExecutiveAPI.explainDecision`).

---

## 10. Growth Brain runtime (money-first)

```text
Observe/Research (+ Product/Price/Ad signals)
  → Revenue Prioritizer → Decision Engine (priority + mix)
  → Planner (under Executive constraints)
  → Generate → Validate → Optimize → Publish (+ Export backup) → Measure/ROI
  → Learn → Reflect → Executive/Decision next cycle
```

Default: Agent Loop + business reallocation — not “블로그 써줘”.

---

## 11. Failure & retry policy

- Node-level retry governed by Policy (max, backoff)
- Provider failures → AI Fallback (see `07_AI.md`)
- Capability loss mid-run → `BLOCKED_CAPABILITY` + Inbox
- Kill Switch → cancel leased jobs → `CANCELLED`

---

## 12. Observability requirements

Every run records: Trace ID, node timings, token/cost, feature denials, governor throttles, validation results. Audit thin logs for denials/kills.

---

## 13. Cross-references

- Constitution state machine → `02_CONSTITUTION.md`
- Growth Decision → `06_GROWTH.md`
- Content Validate → `08_CONTENT.md`
- Automation infra → `12_INFRASTRUCTURE.md`
- Governance → `13_GOVERNANCE.md`

---

## 14. Acceptance (Phase 0)

- [x] Agent Loop includes Validate
- [x] State machine + terminals defined
- [x] Planner Queue between Decision and Workers
- [x] DSL principles + Daily Growth example includes **`publish` node** + **Export backup** (parallel, not sole success)
- [x] Human gates first-class
