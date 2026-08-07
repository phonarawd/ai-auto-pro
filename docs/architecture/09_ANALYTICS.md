# 09 — Analytics: Funnel, ROI, Experiment, Simulator

**Status:** Phase 0 RFC
**Package:** `packages/analytics/`
**Rule:** Analytics measures and experiments — it does not emit daily production mix (Decision does).

---

## 1. Module map

```text
Analytics
├── Funnel + Performance measurement
├── Experiment Engine (A/B) → feeds Learning
├── Growth Simulator / CTR models
└── Revenue measurement inputs → Growth/revenue
```

---

## 2. Funnel & ROI (CLIME path)

Canonical money path:

```text
content → views/CTR → signup → investment → revenue / ROI
```

V1 captures what is available via:

- Manual entry
- Import files
- Official API metrics when Capability allows
- Export-side acknowledgements

**Honesty:** missing stages stay null; no fake firehose.

### AnalyticsSnapshot

Lean persisted rollups (see `14_DATABASE.md`) — tables or JSON metrics blobs until hot.

Events: `RoiRecorded`, `FunnelUpdated` on Domain Bus → Revenue Prioritizer + Executive dashboards.

---

## 3. Experiment Engine (V1)

- Title / thumb / CTA light A/B
- Always HumanGate on spend-like actions
- Winners feed Learning with Confidence
- Multivariate landing / ads arms = L+ (Expansion #10)

```text
Experiment assign → Content variants → Measure → Score → Learning proposal
```

---

## 4. Growth Simulator

- Estimates e.g. “25 reels → est. signups/invest/revenue”
- Outputs are **labeled estimates** with assumption version
- Feeds Revenue Forecast UI (Expansion #8 deepens ops UI)
- Must not auto-mutate Decision without human/Executive policy

---

## 5. Feedback into Growth

| Analytics output | Consumer |
|---|---|
| ROI / CVR by format | Revenue Prioritizer, Decision, Executive |
| Experiment winners | Learning (+ Content templates) |
| Simulator forecasts | Executive planning (labeled) |

Normative example: Reels signup CVR 3× blog → Decision/Executive shift mix.

---

## 6. Domain API

| Method | Kind |
|---|---|
| `AnalyticsAPI.getFunnel` | Query |
| `AnalyticsAPI.getRoi` | Query |
| `AnalyticsAPI.listExperiments` | Query |
| `AnalyticsAPI.createExperiment` | Command |
| `AnalyticsAPI.runSimulation` | Command (async job) |
| `AnalyticsAPI.importMetrics` | Command |

---

## 7. Phase-L+ ports (design only)

From Expansion Map — analytics-related homes:

| # | Expansion | Note |
|---|---|---|
| 2 | Landing Page AI | Experiment + Content |
| 8 | Revenue Forecast ops UI | Simulator + Revenue |
| 10 | Auto Experiment Engine | Scale multivariate |
| 14 | AI Financial Dashboard | Ad spend, LTV, CAC, ROAS |

Paid Ads OS metrics attach later without renaming Analytics Engine.

---

## 8. Observability vs Analytics

| Concern | Home |
|---|---|
| Trace/log/metrics of app health | Observability infra |
| Growth business funnel/ROI | Analytics Engine |

Do not overload one system.

---

## 9. Data model lean

Prefer:

- `AnalyticsSnapshot`
- Experiment arm JSON
- Funnel raw events as JSON until volume forces tables

Postgres port later — same Repository interfaces.

---

## 10. Events

| Event | Bus |
|---|---|
| `RoiRecorded` | Domain |
| `ExperimentCompleted` | Domain |
| `SimulationCompleted` | Domain |
| `MetricsImportFailed` | System |

---

## 11. Anti-patterns

1. Analytics emitting Planner Queue items
2. Unlabeled “predicted revenue” shown as fact
3. Auto-publish winner variants without HumanGate
4. Coupling simulator to a single LLM vendor

---

## 12. Cross-references

- Revenue Prioritizer → `06_GROWTH.md`
- Learning confidence → `11_MEMORY_KNOWLEDGE.md`
- DB snapshots → `14_DATABASE.md`
- Expansion Map → `01_PRODUCT.md`
- Roadmap phases H/I → `15_DESKTOP_AND_ROADMAP.md`

---

## 13. Acceptance (Phase 0)

- [x] Funnel = signup/invest/ROI path
- [x] Experiment → Learning with HumanGate
- [x] Simulator labeled estimates
- [x] No daily mix ownership
- [x] L+ ports listed without V1 claims
