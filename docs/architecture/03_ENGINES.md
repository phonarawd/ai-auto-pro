# 03 — Engines: Domain Map & Package Layout

**Status:** Phase 0 RFC  
**Rule:** Exactly **nine** top-level Domain Engines + slim Meta + Learning package. Intelligence modules nest under engines — they are not new engines.

---

## 1. Domain Engines (9)

| Engine | Owns (incl. nested modules) |
|---|---|
| **AI** | Providers, Prompt Templates/Version/Eval, Router, **Cost Intelligence**, Retry, Stream, Fallback, Cache |
| **Growth** | V1 umbrellas only: `research/ · planning/ · decision/ · revenue/ · knowledge/` |
| **Content** | Produce/optimize once Topic decided (SEO/Hook/Title/Thumb/Hashtag/Repurpose/Quality/Brand) |
| **Workflow** | JSON/YAML DSL procedures |
| **Automation** | **Planner Queue** → Worker Runtime + Resource Scheduler (under Governor) |
| **Analytics** | Funnel + Performance + Experiment + Simulator + feeds Revenue Intelligence |
| **Account** | Accounts, login, Capability, Router, Sandbox |
| **Tool** | BAE, FS, OCR, PDF, Screenshot, Clipboard, Profiles, Local Search, MCP |
| **Memory** | Episodes/facts only (Short/Long/Archive) |

### Not engines (infra)

Storage · Vault · Session · Config · Feature/Policy/Runtime · Notification · Observability · Event buses · Connector Registry · Plugin SDK · Browser Automation (Tool package / infra sibling)

---

## 2. Meta (V1 slim)

```text
packages/meta/
├── Executive AI     ★ Week/Month/Quarter envelopes + theme reallocations
└── Goal Manager     ★ Goal→KPI→Mission chain (not daily ranking)
```

| Moved out of Meta | New home |
|---|---|
| Reflection | `packages/learning/` |
| Cost Intelligence | `packages/ai/` |
| Strategy playbooks | Knowledge Store `namespace=strategy` / Growth planning |

**Phase-L+ AI CEO:** expand Executive to paid+organic portfolio; still **not** a second Decision Engine.

---

## 3. Growth package layout (V1)

```text
packages/growth/
  research/    # Trend, market, competitor, researcher, gap, viral, listening…
  planning/    # Planner, queue producer, missions, scheduler intel, recommendations
  decision/    # Decision Engine + Decision Graph (daily only)
  revenue/     # Prioritizer, attribution, ROI
  knowledge/   # Growth-facing Knowledge Store access
```

### Growth umbrellas → module inventory

| Umbrella | Module focus |
|---|---|
| **decision** | Decision Engine + Decision Graph (daily only) |
| **revenue** | Revenue Prioritizer + ROI rollups + Business Signals inputs |
| **research** | Researcher, Trend/Market/Competitor, Gap/Viral/Listening, Persona/Emotion |
| **planning** | Planner Queue producer, Scheduler intel, Recommendation/Prediction, Topic |
| **knowledge** | Keyword Graph access + Knowledge Store (`growth`/`strategy` namespaces) |

```text
Growth/research
├── Trend (+ Source Layer + Normalizer) · Market · Competitor Watch
├── AI Researcher · Opportunity / Gap / Viral / Audience
└── Persona · Emotion · Brand Intelligence (brand rules also feed Content Validate)

Growth/planning
├── Autonomous Growth Planner · Scheduler Intelligence
├── Topic Generator · Recommendation / Prediction
└── Planner Queue producer (volume buffering)

Growth/decision
└── Decision Engine   ★ sole DAILY priority + mix emitter

Growth/revenue
├── Revenue Intelligence + Prioritizer + ROI
└── Business Signals (Product/Price/Ad) as inputs

Growth/knowledge
└── Knowledge Store access + Keyword Graph + Evolution scores
```

**Ownership rule:** Daily “what to make / how many reels vs blogs” is **only** Decision Engine. Executive sets week/month/quarter envelopes.

Persona/Emotion/Brand/Viral/Gap/Opportunity/Recommendation/Prediction = **services under Research/Planning/Revenue**, not flat Growth siblings.

---

## 4. Content Intelligence (Content Engine)

```text
Content Intelligence
├── Hook / Thumbnail / Title / Hashtag Intelligence
├── SEO Intelligence
├── Cross-Platform Optimizer
├── Quality Scoring
└── Brand application (uses Brand Intelligence)
```

Content does **not** decide Topic priority; it produces after Decision/Topic path.

---

## 5. Analytics nesting

```text
Analytics
├── Experiment Engine (A/B) → Learning Engine
├── Growth Simulator / CTR models
└── Funnel + Revenue measurement
```

Feeds Growth/revenue; does not own daily mix decisions.

---

## 6. Cognition packages

| Package | Role |
|---|---|
| `memory/` | Episodes/facts; Short→Long→Archive |
| Knowledge Store (infra + Growth/knowledge access) | Curated docs/patterns + Evolution |
| `learning/` | Policies + Confidence; Reflection jobs |

See `11_MEMORY_KNOWLEDGE.md`.

---

## 7. Repo package tree (target)

```text
packages/
  ai/ growth/ content/ workflow/ automation/ analytics/ account/ tool/ memory/
  meta/                 # Executive + Goal only
  learning/             # Learning + Reflection
  domain-api/
  storage/ vault/ session/ config/
  feature-management/   # Feature→Policy→Runtime core; extensions optional
  notification/ observability/
  event-bus/ connector-registry/ plugin-sdk/
  browser-automation/
  shared/
plugins/
  connector/ tool/ workflow/ knowledge/ ai/
```

---

## 8. System shape

```text
Desktop Shell → Mission Center → Domain API → Engines
                                      ↓
                         Command / Domain / System buses
                                      ↓
                    Workflow DSL → Automation Workers → Tools
                                      ↓
                         Storage / Vault / Session / Obs
```

UI never imports buses. Engines collaborate via Commands/Events. See `04_DOMAIN_API.md`.

---

## 9. GIL module contracts (summary)

### Decision Engine ★
Merges Trend/Market/Product/Price/Ad signals, Keyword Graph, Topic, Revenue Prioritizer, Opportunity, Viral, Executive horizon constraints, Brand fit → **today’s ordered Mission Priority + production mix**. Writes `DecisionRecord` + Decision Graph.

### Revenue Prioritizer ★
Ranks by expected CLIME path **content → signup → investment → revenue / ROI**, not vanity volume.

### Trend + Source Layer + Normalizer
Pluggable Capability-gated sources → unified score + CLIME-fit + format tips.

### Keyword Graph
Types: Primary/Secondary/Long-tail/Question/Commercial/Evergreen/Seasonal/Trending + graph edges. One article expands to related keywords/topics/follow-ups.

### Topic Generator
Mandatory before body: Keyword/Graph → Topic → Title/Hook path.

### Autonomous Growth Planner
Goal/Gap/Opportunity → Mission templates → Schedule → Forecast. Does **not** rank daily work. Consumes Decision → enqueues Planner Queue.

### AI Researcher
Always-on jobs: rising patterns → Brand-safe CLIME variants → feed Decision.

### Goal Manager
`Goal → KPI → Mission → Strategy → Campaign → Content` (not Planner-private).

### Cost Intelligence (AI)
Per task: cheapest/fastest sufficient provider; budgets; hard-stops.

### Resource Scheduler (Automation)
Global admission: CPU/RAM/GPU/VRAM/token budgets; priority queues.

### Business Signals (Product/Price/Ad)
V1: light analyzers feeding Decision/Revenue. L+: Paid Ads OS + Financial Dashboard.

---

## 10. Planner Queue & Decision Graph

```text
Executive (horizon) → Decision Engine (daily) → Planner Queue → Workflow DSL → Worker Runtime
```

Queue items: Priority · Deadline · Expected ROI · Dependency · Retry · HumanApproval flags.

Decision Graph edges (persist for explainability):

```text
Trend → Keyword → RevenueEstimate → Decision → Mission
  → PlannerQueueItem → WorkflowRun → Content → ROI
```

---

## 11. Registration rule

Every engine module and connector:

1. Lean Registry row: `ID · Version · Dependencies · Lifecycle`
2. Manifest sidecar (name, permissions, settings schema, events, runtime hints)
3. Feature flag key under Feature Management

---

## 12. What must not become engines

| Temptation | Correct home |
|---|---|
| Notification | Infra |
| Config store | Infra |
| SQLite/Prisma | Storage + Repository |
| Connector Doctor | Account ops + Notification/Inbox |
| Paid Ads OS | L+ Expansion under Account + Meta + Decision |
| CRM | L+ Expansion |
| “AI CEO” as new engine | Executive module depth (L+) |

---

## 13. Cross-references

- Product → `01_PRODUCT.md`
- Constitution → `02_CONSTITUTION.md`
- Growth detail → `06_GROWTH.md`
- AI detail → `07_AI.md`
- Content → `08_CONTENT.md`
- Analytics → `09_ANALYTICS.md`
- Account → `10_ACCOUNT.md`
- Infra → `12_INFRASTRUCTURE.md`

---

## 14. Acceptance (Phase 0)

- [x] Nine engines listed with ownership
- [x] Growth five umbrellas only
- [x] Meta slim; Learning separate
- [x] Package tree sketched
- [x] Anti-engine temptations documented
