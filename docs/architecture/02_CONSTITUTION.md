# 02 — Constitution: Invariants & Feature Acceptance Gate

**Status:** Phase 0 RFC (binding)  
**Audience:** Every Cursor implementation pass must satisfy this document.

---

## 1. Purpose

This constitution prevents drift into: universal auto-post fantasy, god-object engines, vendor lock-in, plaintext secrets, and UI↔engine coupling. Violations are **blockers**, not style nits.

---

## 2. Five constitutional locks (approved)

### 2.1 Plugin Contract First

- Modules register via **Manifest** only.
- Core **never** imports module internals.
- Discovery, enablement, and health flow through Module Loader / Connector Registry.
- New capabilities = new registered modules, not core forks.

### 2.2 Schema Versioning

Every JSON payload for the following **must** carry `schema_version`:

| Surface | Example |
|---|---|
| Workflow DSL | Workflow definition / run snapshot |
| Knowledge | KnowledgeItem body / Evolution payload |
| Export | Export pack manifest + `accounts.json` |
| Events | Domain and System event envelopes |

Migrations are additive when possible; readers must reject unknown major versions safely.

### 2.3 Task State Machine

Normative states for production work items:

```text
QUEUED → RUNNING → VALIDATING → OPTIMIZING → READY → PUBLISHED
```

Terminals (documented fully in `05_WORKFLOW.md`): `FAILED`, `CANCELLED`, `BLOCKED_HUMAN`, `BLOCKED_CAPABILITY`, `BLOCKED_POLICY`.

- **VALIDATING** is mandatory before Optimize/Publish.
- **PUBLISHED** includes Export-complete for V1 (export is a first-class publish path).

### 2.4 No AI Vendor Dependency

OpenAI / Gemini / Claude / DeepSeek / Local (Ollama, LM Studio, vLLM, Azure, OpenRouter) live **behind Adapters only**.

- Engines call AI Engine ports, never vendor SDKs directly.
- Failover and Cost Intelligence require multi-provider readiness.
- Prompt Templates are provider-agnostic with adapter-specific render tips.

### 2.5 Everything is a Workflow

Research, Planning, Revenue estimation, Generate, Validate, Optimize, Export, Measure, Learn, Reflect execute as **Workflow Nodes** (JSON/YAML DSL). Adding a procedure = DSL + template registration — not a core code fork.

---

## 3. Layering law: Domain Engines ≠ Infrastructure

| Layer | Examples | Rule |
|---|---|---|
| Domain Engines (9) | AI, Growth, Content, Workflow, Automation, Analytics, Account, Tool, Memory | Own business capabilities |
| Meta (slim) | Executive + Goal | Not a 10th sprawling engine |
| Learning package | Learning + Reflection | Not Meta |
| Infrastructure | Storage, Vault, Session, Config, Feature/Policy/Runtime, Notification, Observability, Event buses, Connector Registry, Plugin SDK | **Not** engines |

Storage/Config/Notification must never be marketed or packaged as Engines.

---

## 4. Export-first & Capability

1. **Default distribution path:** dated Export packs (`publish_ready`).
2. **Live post:** only when Capability Matrix says `canPublish=true` **via official API connector**.
3. **Session ≠ publish:** browser-session assist never silently upgrades to publish.
4. **Official API preferred** over browser assist; assist is opt-in and user-started.
5. UI must show honest Matrix badges: “이 플랫폼은 여기까지 가능합니다.”

### Auth ladder (per connector)

| Priority | Mode | Use |
|---|---|---|
| P0 | Official OAuth / API | Stable connect + publish when API allows |
| P1 | User-approved browser session assist | When API missing/limited; encrypted session |
| P2 | Manual / Export-only | Always available fallback |

**Forbidden in core:** password-first UX as default, stealth anti-detect posting, ToS-hostile automation.

---

## 5. Decision ownership locks

| Concern | Sole owner |
|---|---|
| Daily priority + production mix | **Decision Engine** only |
| Week / Month / Quarter envelopes & themes | **Executive AI** |
| Cost routing | **AI Engine / Cost Intelligence** |
| Reflection / policy proposals | **Learning package** |
| Strategy playbooks | Knowledge Store `namespace=strategy` |

Planner, Recommendation, and Executive **must not** invent competing daily rankings.

---

## 6. Knowledge & cognition chain

```text
Memory (episodes/facts)
  → Knowledge Store (namespaces + type/tags + Evolution)
  → Learning (policies + Confidence Score)
  → Reflection (postmortems → propose Policy Update → Learning)
```

- Memory ≠ Knowledge ≠ Learning ≠ Reflection — no overlapping ownership.
- Learning auto-promotes policy only if **Confidence ≥ threshold** (e.g. 91%); low confidence = suggest only.
- One Knowledge Store; namespaces replace parallel god-stores.

---

## 7. Governance resolution order (V1)

```text
License(default Developer) → Admin/Owner → Project → User → Policy → Capability → Governor
```

Settings cascade: **Global → Project → User** (Workspace deferred to Team Mode L+).

V1 governance core: **Feature → Policy → Runtime** (Governor + Kill Switch).  
Extensions (Permission, License multi-tier, deep Audit UI, Health dashboards, Plugin Marketplace) plug onto the three-core — do not block V1.

---

## 8. Feature Acceptance Gate (binding — 20 checks)

A feature is accepted only if it:

1. Respects **Engine vs Infra** boundaries  
2. UI uses **Domain API only** (no direct bus/engine guts)  
3. Cross-engine collaboration via bus **Commands/Events** (no new hard deps)  
4. No Capability Matrix bypass  
5. No platform logic outside Connector  
6. Async / non-blocking UI  
7. Testable + replaceable module  
8. Observability: Trace ID (+ log when feature flag denies)  
9. New capabilities are **modules under engines/Meta/GIL** — not new top-level engines unless approved  
10. **Decision Engine** sole **daily** priority emitter; Executive owns week/month/quarter only  
11. Business signals feed Executive + Revenue Prioritizer + Decision only  
12. **Every unit registers** (lean Registry row + Manifest sidecar)  
13. Runtime checks **Feature → Policy → Runtime** (+ Capability); Permission/License deepen later  
14. **Kill Switch** required; Audit/Health as thin V1 logs  
15. Resource Scheduler/Cost Intelligence honor **Policy + Governor**  
16. Decision output enters **Planner Queue** before Workflow/Workers  
17. Learning auto-promote only with sufficient **Confidence**  
18. Settings resolve **Global → Project → User** (Workspace = L+/Team)  
19. Agent Loop includes **Validate** before Optimize/Publish  
20. Knowledge is one **Knowledge Store** (namespaces), not parallel god-stores  

---

## 9. Secrets & data honesty

- Credentials/sessions **never** stored in plaintext; Vault / OS keychain only.
- Never commit `.env` secrets, tokens, or vault material.
- Capability-gated sources; Cost/Resource limits always enforceable.
- Simulator/forecast outputs must be **labeled estimates**.

---

## 10. Development Principles (binding)

1. Features independently replaceable  
2. Engines testable in isolation  
3. Workflows resumable  
4. Long AI work async  
5. UI never blocks on AI  
6. Artifacts versioned  
7. No direct LLM vendor lock-in  
8. Usable if one provider fails  
9. No feature may assume a platform can publish without Capability Matrix  
10. Credentials/sessions never stored in plaintext  
11. Official API before browser-session assist; assist never silently upgrades to publish  

---

## 11. Module Registry (lean)

**Registry row (minimal):** `ID · Version · Dependencies · Lifecycle`  
**Manifest sidecar:** Name, Author, Description, Permission, License, Settings Schema, Events, Runtime hints  

Avoid bloated registry tables that store everything.

---

## 12. Controllable surfaces

Engines, research sources, content channels, analytics modules, AI models (priority/cost/fallback/tokens), connector ops, workflows, workers — all Feature+Policy+Runtime; start with essential keys, expand schema via JSON.

---

## 13. Anti–God Object surgery (V1)

| Area | Rule |
|---|---|
| Growth | Five umbrellas only: research / planning / decision / revenue / knowledge |
| Meta | Executive + Goal only |
| Knowledge | One store + namespaces |
| Governance | Feature→Policy→Runtime core first |
| DB | Lean first-class tables; JSON for the rest |

---

## 14. Cross-references

- Product positioning → `01_PRODUCT.md`
- Engines → `03_ENGINES.md`
- Domain API → `04_DOMAIN_API.md`
- Workflow / state machine detail → `05_WORKFLOW.md`
- Governance package → `13_GOVERNANCE.md`
- Account / Matrix → `10_ACCOUNT.md`

---

## 15. Acceptance (Phase 0)

- [x] Five constitutional locks written
- [x] Export-first + session≠publish
- [x] 20-point Feature Acceptance Gate
- [x] Decision/Executive ownership split
- [x] Cognition chain + Confidence rule
