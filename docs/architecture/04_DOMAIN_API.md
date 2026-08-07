# 04 — Domain API: Renderer → IPC → Engines

**Status:** Phase 0 RFC
**Critical rule:** UI must never import buses, Drizzle/ORM clients, connectors, or engine internals.

---

## 1. Boundary law

```text
Renderer (Next.js UI)
  → Electron IPC (preload bridge)
    → Domain API (main/node process)
      → Engines / Meta / Learning
           ↓
    Command / Query / Domain / System buses (internal only)
```

| Allowed in Renderer | Forbidden in Renderer |
|---|---|
| Domain API client calls | Event bus subscribe/publish |
| View-models / DTO types | Direct engine class imports |
| Feature-flag *presentation* | Capability Matrix mutation |
| Trace ID display | Vault / Drizzle / Playwright |

---

## 2. API surface (V1 namespaces)

| Namespace | Purpose |
|---|---|
| `GrowthAPI.*` | Research jobs, decisions, planner queue views, missions |
| `ContentAPI.*` | Generate, validate, optimize, artifacts, export packs |
| `AnalyticsAPI.*` | Funnel, ROI snapshots, experiments, simulator |
| `AccountAPI.*` | Connect, Matrix, Router, Health, Sandbox, Wizard |
| `ExecutiveAPI.*` | Horizon goals, explain Decision Graph, reallocations |
| `WorkflowAPI.*` | Templates, runs, resume/cancel |
| `AutomationAPI.*` | Queue depth, worker status, START mission |
| `KnowledgeAPI.*` | Namespaced Knowledge Store CRUD/search |
| `MemoryAPI.*` | Episode browse (read-heavy) |
| `LearningAPI.*` | Policies, confidence, reflection proposals |
| `GovernanceAPI.*` | Feature/Policy/Runtime/Kill (admin) |
| `SettingsAPI.*` | Global → Project → User |
| `NotificationAPI.*` | Inbox, toast prefs |
| `ToolAPI.*` | Profiles list, FS pickers (safe), OCR triggers |

All methods return typed results + `traceId`. Mutations are Commands under the hood.

---

## 3. Electron mapping (first-class)

### 3.1 Process roles

| Process | Runs |
|---|---|
| Main | Domain API host, engines, workers orchestrator, vault access |
| Preload | Narrow `contextBridge` exposing Domain API client only |
| Renderer | Next.js UI — Mission Center, Account Manager, etc. |

### 3.2 IPC conventions

```text
channel: "domain:<namespace>.<method>"   # namespace lowercase; method camelCase
payload: { requestId, schema_version, traceId, projectId?, args }
response: { requestId, ok, data | error, traceId }
```

- **`requestId`:** caller-generated correlation id (dedup, cancel, streaming).
- **`traceId`:** required on **both** request and response; UI origin on user actions; propagated through engines and observability.
- **`schema_version`:** `@clime/shared` `SCHEMA_VERSION` at boundary; reject unknown.
- Async commands (`[A]` in frozen map): return `{ jobId, traceId, schema_version }` immediately (`job_<ulid>`); UI must not await completion on IPC.
- Progress via System/Domain events forwarded as **Inbox/NotificationAPI push**, not open bus subscriptions in UI.

**Frozen contract:** [`S3A_DOMAIN_API_CONTRACT.md`](../appendix/S3A_DOMAIN_API_CONTRACT.md) — full namespace·method map + jobId rules.

- Streaming (token stream): optional `domain:ai.stream` with backpressure; cancel via `requestId`.

### 3.3 Preload allowlist

Only expose the Domain API client. No `require`, no Node, no raw `ipcRenderer.on('*')`.

---

## 4. Command vs Query

| Kind | Behavior | Example |
|---|---|---|
| Query | Read models; idempotent; may hit Query Bus or repos | `GrowthAPI.getMissionToday` |
| Command | Intent; validated Feature→Policy→Capability→Governor | `ContentAPI.enqueueGenerate` |

Prefer Domain API read models over Query Bus for UI. Engines may still use Query Bus internally.

---

## 5. Error model

```text
DomainError {
  code: FEATURE_DISABLED | POLICY_DENIED | CAPABILITY_DENIED |
        GOVERNOR_THROTTLED | KILL_SWITCH | VALIDATION_FAILED |
        NOT_FOUND | CONFLICT | PROVIDER_FAILED | UNKNOWN
  message: human-safe string
  retryable: boolean
  traceId: string
  details?: { schema_version, fieldErrors? }
}
```

UI maps codes to Inbox / Doctor / Matrix badges — never raw stack traces.

---

## 6. AuthN/AuthZ for local app

V1: single Owner/Admin on machine (Developer license default).
API still checks Project scope + Feature/Policy/Capability so Team Mode (L+) can deepen without rewriting UI calls.

---

## 7. Event forwarding to UI

Engines publish on Domain/System buses. Domain API **selectively** forwards:

| Event | UI surface |
|---|---|
| `MissionReady` | Mission Center |
| `ContentReadyForReview` | Mission Center / Content |
| `SessionExpired` | Inbox + Account Health |
| `GovernorThrottled` | Toast + Inbox |
| `KillSwitchActivated` | Blocking banner |
| `ReflectionProposal` | Learning inbox card |

Forwarding uses a **UI Subscription** table (event type → channel), not “UI listens to everything.”

---

## 8. Sample contracts (illustrative)

### GrowthAPI.getMissionToday

```text
in:  { projectId }
out: { missions[], decisionExplain?, queueDepth, schema_version }
```

### ContentAPI.exportPack

```text
in:  { projectId, contentIds[], format: "dated-folder" }
out: { exportPath, files[], accountsJson, schema_version }
```

### AccountAPI.getCapabilityMatrix

```text
in:  { accountId }
out: {
  canPublish,
  publishMode: "api" | "session",
  riskLevel: "low" | "medium" | "high",
  flags: { read, profile, schedule, publish, story, reels, ... },
  source: "manifest",
  schema_version
}
```

### ExecutiveAPI.explainDecision

```text
in:  { decisionId }
out: { graph: nodes[], edges[], narrative, schema_version }
```

---

## 9. Versioning

- Domain API methods are versioned as `schema_version` on payloads.
- Breaking IPC changes bump major; preload and renderer ship together.
- Deprecated methods remain one minor cycle with logging.

---

## 10. Testing strategy

| Layer | Test |
|---|---|
| Domain API | Contract tests with fake engines |
| IPC | Integration with mock preload |
| Renderer | MSW-style Domain API mocks only |
| Engines | No Electron required |

---

## 11. Anti-patterns

1. Renderer importing `@clime/growth/decision`
2. `ipcMain` handlers calling Drizzle/ORM directly (bypass Domain API)
3. UI constructing Workflow DSL and writing files without WorkflowAPI
4. “Temporary” bus subscription “just for debugging” left in production UI
5. Platform SDK in renderer for “faster login”

---

## 12. Package home

```text
packages/domain-api/
  src/
    growth/
    content/
    analytics/
    account/
    executive/
    ...
  electron/
    ipc-register.ts
    preload-bridge.ts
```

---

## 13. Cross-references

- Engines → `03_ENGINES.md`
- Workflow → `05_WORKFLOW.md`
- Buses → `12_INFRASTRUCTURE.md`
- Account Matrix → `10_ACCOUNT.md`
- Desktop UX → `15_DESKTOP_AND_ROADMAP.md`
- **Frozen implementation contract** → [`S3A_DOMAIN_API_CONTRACT.md`](../appendix/S3A_DOMAIN_API_CONTRACT.md)

---

## 14. Acceptance (Phase 0)

- [x] Renderer→IPC→Domain API path defined
- [x] Namespace list for V1
- [x] UI forbidden imports stated
- [x] Error + event forwarding model
- [x] Electron mapping first-class
