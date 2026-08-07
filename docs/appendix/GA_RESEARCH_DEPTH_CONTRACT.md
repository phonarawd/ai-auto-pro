# G-A Research Depth Module Map Contract (FROZEN)

**Status:** FROZEN — plan to-do `g-a` (GROK4.5/256K); **Prove** in `g-d`  
**Normative for:** `g-b` (Researcher + Competitor + Micro-Audit teardown base) / `g-c` (Gap + Opportunity + Viral) — implement **under `packages/growth/research` only**; no scope explosion  
**Anchors:** `(vg-a §1` Micro-Audit base`)` — [`VGA_VIRAL_GROWTH_CONTRACT.md`](VGA_VIRAL_GROWTH_CONTRACT.md) §2  
**SSOT parents:** [`06_GROWTH.md`](../architecture/06_GROWTH.md), [`03_ENGINES.md`](../architecture/03_ENGINES.md), [`15_DESKTOP_AND_ROADMAP.md`](../architecture/15_DESKTOP_AND_ROADMAP.md), [`14_DATABASE.md`](../architecture/14_DATABASE.md), [`DA_RESEARCH_TOPIC_CONTRACT.md`](DA_RESEARCH_TOPIC_CONTRACT.md), [`VGA_VIRAL_GROWTH_CONTRACT.md`](VGA_VIRAL_GROWTH_CONTRACT.md), [`S3A_DOMAIN_API_CONTRACT.md`](S3A_DOMAIN_API_CONTRACT.md)

---

## 0. Locks & Invariants (non-negotiable)

| Lock | Rule |
|---|---|
| **Home = `growth/research` only** | Researcher · Competitor · Gap · Opportunity · Viral · Micro-Audit teardown **all** live under `packages/growth/research` (`@clime/growth-research`). **Top-level engine packages for these = 0** |
| **Growth 5 umbrellas** | Allowed growth dirs: `research` · `planning` · `decision` · `revenue` · `knowledge` only. No `packages/viral`, `packages/competitor`, `packages/gap`, `packages/opportunity`, `packages/researcher`, no flat Growth siblings |
| **Micro-Audit split** | `g-b` owns structured teardown diagnosis (Zod + `schema_version`); `vg-b` owns PDF/infographic + badge + referral. `g-b` **must not** implement viral PDF export or referral badge |
| **Public sources only** | Competitor / Micro-Audit inputs = public URL/SNS/RSS / free fixtures — no private session steal, no captcha bypass |
| **Paid API = 0 on depth path** | Depth analysis uses deterministic heuristics and/or free_local adapters only. `paidApiRequired: false` on Micro-Audit / Competitor / Viral / Researcher envelopes |
| **No AI vendor SDK** | Call AI only via optional `@clime/ai` port if needed; V1 MVP may be fully deterministic. OpenAI/Gemini/… SDKs never in this package |
| **Repository only** | Persist via `@clime/storage` KnowledgeRepository (JSON-until-hot) — no Drizzle/SQLite imports in research depth modules |
| **Schema versioning** | All depth artifacts: Zod + required `schema_version` |
| **Decision daily ownership** | Depth modules **feed** Decision (signals/reports); they **must not** emit daily Mission priority / mix |
| **UI → Domain API** | Renderer never imports `@clime/growth-research`; channels stay `domain:growth.*` |
| **Validate before publish** | Micro-Audit / Viral artifacts that enter a publish path still require Content Validate (constitutional). Depth analysis itself is not a publish step |

**Forbidden (merge blockers):** top-level `packages/{viral,competitor,gap,opportunity,researcher}` · new Growth umbrella beyond five · PDF/badge in `g-b` · session/captcha bypass · Prisma/Supabase · vendor SDKs in research · daily ranker inside Researcher/Opportunity · Topic Generator under research · Export backup pack as Micro-Audit artifact

---

## 1. Module map (package seats)

| Module | Seat (file) | Owning to-do | Owns | Does **not** own |
|---|---|---|---|---|
| **AI Researcher** | `packages/growth/research/src/researcher.ts` | `g-b` | Always-on-style pattern report from public/trend signals → Brand-safe CLIME variant hints → Decision feed | Daily priority; Topic Generator; Multi-Jack variants (`vg-c`) |
| **Competitor Watch** | `…/competitor.ts` | `g-b` | Public URL/SNS → competitor mosaic teardown (strengths/weaknesses/copy/formats) | Full Competitor Spy+ (L+); paid social APIs; PDF export |
| **Micro-Audit teardown** | `…/micro-audit.ts` | `g-b` `(vg-a §1` base`)` | Structured diagnosis: trend fit, copy patterns, keyword/gap notes, CLIME-fit tips | Viral PDF/infographic + badge + referral (`vg-b`) |
| **Gap** | `…/gap.ts` | `g-c` | Keyword/content gap analysis vs own graph + competitor/public signals | Planner Mission templates; Executive horizons |
| **Opportunity** | `…/opportunity.ts` | `g-c` | Ranked opportunity scores (추정-labeled where numeric forecast) for Decision/Planning inputs | Daily Decision emission; Revenue Prioritizer ownership |
| **Viral (analysis)** | `…/viral.ts` | `g-c` | Viral signal / hook / format tips analysis (`paidApiRequired: false`) | `.clime` playbook (`vg-d`); Micro-Audit PDF (`vg-b`); 7-channel Repurposer (`c1-b`) |

```text
packages/growth/
├── research/          ← ALL Phase G depth modules (this contract)
│   ├── researcher.ts
│   ├── competitor.ts
│   ├── micro-audit.ts
│   ├── gap.ts
│   ├── opportunity.ts
│   └── viral.ts
├── planning/
├── decision/
├── revenue/
└── knowledge/         ← may be scaffolded later; still an allowed umbrella

FORBIDDEN top-level:
  packages/viral · packages/competitor · packages/gap
  packages/opportunity · packages/researcher · packages/micro-audit
```

```text
UI → domain:growth.*
  → ResearchEngine (depth extensions)
      runResearcherJob → ResearcherReport
      runCompetitorTeardown → CompetitorTeardown
      runMicroAudit → MicroAuditTeardown   (vg-a §1 base; no PDF)
      analyzeGap → GapAnalysis
      scoreOpportunity → OpportunityScore
      analyzeViral → ViralSignal
  → Storage KnowledgeRepository only (JSON-until-hot)
  → Decision/Planning consume reports as inputs (read) — never reverse-owned
```

---

## 2. AI Researcher (`g-b`)

### 2.1 Behavior

Ingests existing NormalizedTrend / Keyword Graph (and optional public fixture patterns) → extracts rising patterns (title/hook/format/CTA) → Brand-safe CLIME variant **hints** → report feedable by Decision.

V1 MVP: deterministic heuristics; no paid API; no always-on cron required (callable via Domain API / research job).

### 2.2 Envelope

```ts
{
  schema_version: 1,
  kind: "growth.researcher_report",
  id: string,
  projectId: string,
  patterns: Array<{
    id: string,
    title: string,
    hook?: string,
    formatTips: string[],
    evidence: string[]
  }>,
  brandSafeVariants: string[],
  feedsDecision: true,            // literal — Decision may consume
  paidApiRequired: false,
  createdAt: string               // ISO-8601
}
```

---

## 3. Competitor Watch (`g-b`)

### 3.1 Controls

| Control | Norm |
|---|---|
| Input | `targetUrl` (public) and/or public SNS handle string — **no** session cookies |
| Failure | Scrape/fixture miss → structured error + `traceId` path; **no** silent fake mosaic |
| Cost | Free/public fixture OK for GREEN prove |

### 3.2 Envelope

```ts
{
  schema_version: 1,
  kind: "growth.competitor_teardown",
  id: string,
  projectId: string,
  targetUrl: string,
  mosaic: {
    strengths: string[],
    weaknesses: string[],
    copyPatterns: string[],
    formats: string[]
  },
  paidApiRequired: false,
  createdAt: string
}
```

---

## 4. Micro-Audit teardown (`g-b`, vg-a §1 base)

### 4.1 Controls

| Control | Normative behavior | Owner |
|---|---|---|
| Public sources only | URL/SNS/RSS / free fixture | `g-b` |
| Teardown artifact | trend fit · copy patterns · keyword/gap notes · CLIME-fit tips; Zod + `schema_version` | `g-b` |
| Viral export | PDF/infographic + badge + referral | **`vg-b` only** |
| Cost | `paidApiRequired: false` | `g-b` |

### 4.2 Envelope

```ts
{
  schema_version: 1,
  kind: "growth.micro_audit_teardown",
  id: string,
  projectId: string,
  sourceUrl: string,
  sourceKind: "public_url" | "public_sns" | "public_rss" | "fixture",
  diagnosedAt: string,
  trendFit: { score: number, notes: string[] },   // score 0..1
  copyPatterns: string[],
  keywordGapNotes: string[],
  climeFitTips: string[],
  competitorTeardownId?: string,                  // optional link to Competitor artifact
  playbookHints: string[],                        // tailored text hints — not PDF
  paidApiRequired: false,
  // FORBIDDEN fields in g-b: pdfPath, referralBadge, exportBackupPath
}
```

**Merge blocker:** Micro-Audit artifact that includes PDF path / referral badge / Export backup pack shape.

---

## 5. Gap (`g-c`)

### 5.1 Envelope

```ts
{
  schema_version: 1,
  kind: "growth.gap_analysis",
  id: string,
  projectId: string,
  gaps: Array<{
    id: string,
    label: string,
    severity: number,           // 0..1
    notes: string
  }>,
  keywordGaps: string[],
  createdAt: string
}
```

Uses Keyword Graph + optional Competitor/Micro-Audit outputs. Does not write DecisionRecord.

---

## 6. Opportunity (`g-c`)

### 6.1 Envelope

```ts
{
  schema_version: 1,
  kind: "growth.opportunity_score",
  id: string,
  projectId: string,
  opportunities: Array<{
    id: string,
    title: string,
    score: number,              // 0..1
    rationale: string,
    isEstimate: true,
    estimateLabel: "추정"
  }>,
  createdAt: string
}
```

**Merge blocker:** opportunity numeric ranks omitting `isEstimate: true` / `estimateLabel: "추정"`.

Does **not** emit daily Mission priority (Decision only).

---

## 7. Viral analysis (`g-c`)

### 7.1 Envelope

```ts
{
  schema_version: 1,
  kind: "growth.viral_signal",
  id: string,
  projectId: string,
  signals: Array<{
    id: string,
    topic: string,
    viralityScore: number,      // 0..1
    hooks: string[],
    formatTips: string[]
  }>,
  paidApiRequired: false,
  createdAt: string
}
```

**Not** Micro-Audit PDF, **not** `.clime`, **not** 7-channel Repurposer.

---

## 8. Domain API (frozen channels — Growth namespace)

IPC: `domain:growth.<method>` + envelope `{ requestId, schema_version, traceId }` (S3A).

| Method | Kind | Owner | Notes |
|---|---|---|---|
| `runResearcherJob` | A | research | Pattern report; may complete sync in-process for V1 tests |
| `runCompetitorTeardown` | C | research | `{ targetUrl }` → CompetitorTeardown |
| `runMicroAudit` | C | research | `{ sourceUrl, sourceKind? }` → MicroAuditTeardown (no PDF) |
| `analyzeGap` | C | research | GapAnalysis from graph (+ optional teardown ids) |
| `scoreOpportunity` | C | research | OpportunityScore (추정 labels) |
| `analyzeViral` | C | research | ViralSignal analysis |
| `getMicroAudit` | Q | research | Latest Micro-Audit for project (empty OK) |
| existing research methods | — | research | Unchanged (`runResearchJob`, Brand, Multi-Jack hook, …) |

Long work returns `jobId` where Kind=A; UI must not block.

---

## 9. Persistence (lean)

| Artifact | Store |
|---|---|
| Researcher / Competitor / Micro-Audit / Gap / Opportunity / Viral | `KnowledgeItem` `namespace=growth` with distinct `type` keys below |

| type | key |
|---|---|
| `researcher_report` | `researcher_report` (latest) or id |
| `competitor_teardown` | latest / id |
| `micro_audit_teardown` | `micro_audit_teardown` (latest) |
| `gap_analysis` | `gap_analysis` |
| `opportunity_score` | `opportunity_score` |
| `viral_signal` | `viral_signal` |

**No new SQLite tables** in Phase G.

---

## 10. Feature keys (seed-compatible)

| Feature key | Gates |
|---|---|
| `feature.growth.runResearcherJob` | Researcher |
| `feature.growth.runCompetitorTeardown` | Competitor |
| `feature.growth.runMicroAudit` | Micro-Audit base |
| `feature.growth.getMicroAudit` | Query latest audit |
| `feature.growth.analyzeGap` | Gap |
| `feature.growth.scoreOpportunity` | Opportunity |
| `feature.growth.analyzeViral` | Viral analysis |

---

## 11. Import DAG (frozen)

```text
@clime/growth-research  → @clime/shared, zod, @clime/storage (ports)

apps/desktop main → wires research depth handlers (same createResearchDomainHandlers)
Renderer          → DomainClient only

NO drizzle/sqlite · NO playwright · NO platform SDKs ·
NO packages/viral god · NO PDF renderer in g-b ·
NO research → planning cycle · NO Decision write from depth modules
```

---

## 12. Part ownership

| Part | Model | Deliverable |
|---|---|---|
| `g-a` | GROK4.5 | **This file** — module map + envelopes + locks (code 0 preferred; doc-only OK) |
| `g-b` | COMPOSER2.5 | Researcher + Competitor + Micro-Audit teardown base under `research/` |
| `g-c` | COMPOSER2.5 | Gap + Opportunity + Viral under `research/` |
| `g-d` | GROK4.5 | Prove: top-level engine 유출 0 · Growth 5 umbrella · depth modules GREEN |

---

## 13. Prove checklist (`g-d`)

- [ ] Researcher / Competitor / Gap / Opportunity / Viral / Micro-Audit seats exist **only** under `packages/growth/research/src/`
- [ ] Top-level packages `viral` · `competitor` · `gap` · `opportunity` · `researcher` · `micro-audit` = **0**
- [ ] Growth dirs ⊆ `{research,planning,decision,revenue,knowledge}` (no extra umbrella)
- [ ] `runMicroAudit` → `kind: growth.micro_audit_teardown`, `paidApiRequired: false`, no `pdfPath` / referral badge
- [ ] Opportunity rows carry `isEstimate: true` + `estimateLabel: "추정"`
- [ ] Prisma / Supabase / Playwright / vendor SDK deps = 0 in research
- [ ] `pnpm lint` / `typecheck` / `test` GREEN

---

## 14. Explicit non-goals (out of Phase G)

- Micro-Audit PDF / infographic / badge / referral (`vg-b`)
- Multi-Jack multi-format variant pack (`vg-c`)
- `.clime` playbook IO (`vg-d`)
- Competitor Spy+ / Listening+ deep crawl (Phase L+)
- Persona/Emotion full engines (prefs UI = K1)
- `packages/growth/knowledge` façade (separate slice)
- New first-class DB tables
- Daily Decision emission from Opportunity/Researcher

---

## 15. Handoff

| Part | Model | Next |
|---|---|---|
| `g-a` DONE | GROK4.5 | → `g-b` COMPOSER2.5 implement Researcher+Competitor+Micro-Audit per this file + vg-a §1 |
| `g-b` | COMPOSER2.5 | → `g-c` Gap/Opportunity/Viral |
| `g-c` | COMPOSER2.5 | → `g-d` GROK Prove |
| `g-d` GREEN | GROK4.5 | → `vg-b` (PDF+badge) may start; plan click order continues |
