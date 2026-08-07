# 06 — Growth: Research · Planning · Decision · Revenue · Knowledge

**Status:** Phase 0 RFC
**Package:** `packages/growth/{research,planning,decision,revenue,knowledge}`
**Anti-pattern:** Growth must not become the whole OS.

---

## 1. Five service umbrellas only

```text
Growth
├── Research service
├── Planning service
├── Decision service     ★ daily priority ONLY
├── Revenue service
└── Knowledge service
```

Nested intelligence (Persona, Emotion, Brand, Viral, Gap, Opportunity, Recommendation, Prediction) lives **under** these umbrellas — never as flat Growth siblings or new top-level engines.

---

## 2. Money-first Growth OS loop

```text
Trend/Sources → Keyword Graph → Topic → Revenue Estimate
  → Decision Engine (daily) → Planner Queue
  → Generate → Validate → Optimize
  → Review/Export → Measure + Revenue → Learn/Reflect → Repeat
```

Mission Center = Decision Engine output; **START** runs Agent Loop slice.

---

## 3. Decision service ★

### 3.1 Sole daily arbiter

Merges:

- Trend / Market / Competitor signals
- Product / Price / Ad business signals
- Keyword Graph + Topic
- Revenue Prioritizer scores
- Opportunity / Viral
- Executive horizon constraints
- Brand fit

→ **today’s ordered Mission Priority + production mix**.

**Only** daily priority emitter. Planner / Recommendation / Executive do **not** invent competing daily rankings.

### 3.2 Outputs

- `DecisionRecord` (persisted)
- **Decision Graph** nodes/edges for explainability
- Planner Queue enqueue directives (via planning producer)

### 3.3 Decision Graph

```text
Trend → Keyword → RevenueEstimate → Decision → Mission
  → PlannerQueueItem → WorkflowRun → Content → ROI
```

Powers AI Executive Dashboard (“ROI +18% → more reels / fewer blogs”) and Mission Center “why”.

---

## 4. Revenue service

### Revenue Prioritizer ★

Ranks by expected CLIME path:

```text
content → signup → investment → revenue / ROI
```

Not vanity volume (raw views without conversion path).

- Feeds Decision Engine daily
- Executive uses same ROI rollups for month/quarter reallocations
- Analytics Funnel + snapshots are inputs (see `09_ANALYTICS.md`)

### Business Signals (V1 light)

| Signal | V1 | L+ |
|---|---|---|
| Product | Analyzer input | Deeper catalog sync |
| Price | Analyzer input | Pricing experiments |
| Ad | Analyzer input | Paid Ads OS + Financial Dashboard |

Signals feed Executive + Revenue Prioritizer + Decision **only** — not random engines.

---

## 5. Research service

### Trend Intelligence + Source Layer + Normalizer

Pluggable sources (Capability-gated), e.g.:

Google Trends, Naver DataLab, YT/TikTok/IG/Threads, Reddit, News, cafes/communities (Naver Cafe, DC, FMKorea, Ruliweb…), X, Product Hunt, GitHub, Play/App Store, Amazon/Coupang, blogs/Brunch, etc.

**Trend Normalizer** → unified score + CLIME-fit + format tips.

### Keyword Intelligence + Keyword Graph

Types: Primary / Secondary / Long-tail / Question / Commercial / Evergreen / Seasonal / Trending

Edges example: `AI부업 ↔ GPT ↔ ChatGPT ↔ 자동화 ↔ Cursor ↔ AI코딩 ↔ 돈버는AI`

One article → expand: related keywords N, related topics N, follow-up posts N.

### AI Researcher

Always-on jobs: e.g. top rising AI videos → title/hook/length/thumb/comments/CTA patterns → Brand-safe CLIME variants → feed Decision.

### Market / Competitor / Gap / Viral / Listening / Audience

Broader than spike chase: AI market, invest market, sidehustle, policy/legal/news, competitor mosaic → Executive + Decision.

### Persona + Emotion

Same keyword → different format/channel by demo (e.g. 40s male → Reels; 60s → Naver blog). Score levers: Fear, Curiosity, Greed, Hope, Urgency, Authority, Trust — learn what converts for CLIME.

### Brand Intelligence (research-owned rules)

Tone, forbidden, CTA, phrases, voice, color/emotion; “CLIME답지 않음” judgments. Also feeds Content Validate.

**Data honesty:** Capability-gated sources; Cost/Resource limits always enforceable.

**Not owned here:** **Topic Generator** — package home is `growth/planning` (research supplies Keyword/Graph inputs only).

---

## 6. Planning service

### Autonomous Growth Planner

Builds executable plans from Goal/Gap/Opportunity → Mission templates → Schedule → Forecast.
Does **not** rank daily work (that is Decision). Consumes Decision → enqueues Planner Queue.

### Topic Generator

**Package home: `growth/planning`** (not under `growth/research`, not a research sibling package).
Mandatory before body: Keyword/Graph (**research inputs**) → Topic (**planning**) → Title/Hook path.
**Phase D window:** research Trend Source + Normalizer + Keyword Graph **inputs** + planning Topic Generator (same delivery window; ownership stays planning).

### Planner Queue producer

Buffers volume; fields defined in `05_WORKFLOW.md`.

### Scheduler Intelligence

Suggests timing; Automation owns cron/event triggers.

### Recommendation / Prediction

Supportive signals into Decision — **not** alternate daily rankings.

### Mission Templates

`SNS Growth` · `SEO Growth` · `Referral` · `Investment` — instantiate from Goal/Strategy chain.

---

## 7. Knowledge service (Growth-facing)

Access layer to unified Knowledge Store for namespaces:

- `growth`
- `strategy` (playbooks — not a Meta god-object)
- related reads: `competitor`, `brand` (as needed)

Keyword Graph persistence/access lives here or adjacent storage ports — one conceptual graph.

Evolution scores: use → score → promote/demote/retire/regenerate (see `11_MEMORY_KNOWLEDGE.md`).

---

## 8. Executive interaction (not inside Growth)

| Horizon | Owner |
|---|---|
| Week / Month / Quarter envelopes | Meta Executive AI |
| Daily mix / priority | Growth Decision Engine |

Executive may constrain (“this week ≤5 blogs, ≥20 reels”); Decision fills today within envelopes.

---

## 9. Domain API (Growth)

Examples:

- `GrowthAPI.getMissionToday`
- `GrowthAPI.runResearchJob`
- `GrowthAPI.getDecision` / `explain` (may delegate ExecutiveAPI)
- `GrowthAPI.listPlannerQueue`
- `GrowthAPI.getKeywordGraph`

UI never calls research connectors directly.

---

## 10. Events (illustrative)

| Event | Bus |
|---|---|
| `TrendSpikeDetected` | Domain |
| `KeywordDiscovered` | Domain |
| `DecisionMade` | Domain |
| `PlannerItemEnqueued` | Domain |
| `RoiRecorded` | Domain (Analytics/Revenue) |

---

## 11. Package layout reminder

```text
packages/growth/
  research/
  planning/
  decision/
  revenue/
  knowledge/
```

Each submodule: Manifest + Feature keys + tests in isolation.

---

## 12. V1 MVP sequencing (aligned with roadmap)

| Phase | Growth slice |
|---|---|
| D | **research 입력** (Trend Source + Normalizer + Keyword Graph) + **planning Topic** (`growth/planning`) |
| E | Revenue + Decision Graph → Mission Center |
| G | Researcher + Competitor/Gap/Opportunity/Viral |
| H | Planning polish + Scheduler intel + Experiments hook |
| I | ROI loop with Learning/Reflection |
| J | Executive constraints consumed cleanly |

---

## 13. Anti-patterns

1. Second daily ranker in Planner or Recommendation
2. Growth importing Instagram SDK
3. Parallel `GrowthKnowledge` table beside Knowledge Store
4. Executive writing Planner Queue items directly
5. Research firehose without Capability/Cost gates
6. Topic Generator implemented under `growth/research` (home is **planning**)

---

## 14. Cross-references

- Engines map → `03_ENGINES.md`
- Workflow / Queue → `05_WORKFLOW.md`
- Content produce → `08_CONTENT.md`
- Analytics ROI → `09_ANALYTICS.md`
- Knowledge → `11_MEMORY_KNOWLEDGE.md`
- Expansion Map → `01_PRODUCT.md`

---

## 15. Acceptance (Phase 0)

- [x] Five umbrellas only
- [x] Decision sole daily arbiter
- [x] Revenue path = signup/invest/ROI
- [x] Research inventory nested correctly
- [x] Topic Generator package home = `growth/planning` (Phase D = research inputs + planning Topic)
- [x] Planner does not rank daily
