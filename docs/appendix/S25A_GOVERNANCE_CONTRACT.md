# S2.5-A Governance Contract (FROZEN)

**Status:** FROZEN — plan to-do `s2.5-a` (GROK4.5/256K); **Prove GREEN** (`s2.5-c` — [`S25C_GOVERNANCE_PROVE.md`](S25C_GOVERNANCE_PROVE.md))  
**Normative for:** `s2.5-b` implementation (COMPOSER2.5) — implement **this file only**; no scope expansion  
**SSOT parents:** [`13_GOVERNANCE.md`](../architecture/13_GOVERNANCE.md), [`14_DATABASE.md`](../architecture/14_DATABASE.md), [`S2A_STORAGE_CONTRACT.md`](S2A_STORAGE_CONTRACT.md), [`02_CONSTITUTION.md`](../architecture/02_CONSTITUTION.md), [`04_DOMAIN_API.md`](../architecture/04_DOMAIN_API.md)

---

## 0. Locks (non-negotiable)

| Lock | Rule |
|---|---|
| Core | V1 = **Feature → Policy → Runtime** (+ Kill Switch). Extensions (Permission/License UI/Marketplace) do **not** block V1 |
| Package | `@clime/feature-management` under `packages/feature-management/` |
| Persist | Only via `@clime/storage` Repository ports — **never** import Drizzle / SQLite drivers |
| Tables | Map 1:1 to Storage first-class: `FeatureState` / `PolicyRule` / `KillSwitchState` (+ thin `AuditEvent`) |
| Gate | **Runtime 미통과 기능 실행 = 0** — every Command / external side effect calls `admit()` first |
| UI | UI may **display** Feature/Policy/Kill/Runtime status; **mutations only** through `GovernanceAPI` surface (this package’s mutation methods; Domain API host wraps in slice 3) |
| Kill Switch | Activate → cancel leased / in-flight work → Workflow `CANCELLED` + System `KillSwitchActivated` + audit |
| Config | Config package = values/prefs; **not** a substitute for Feature/Policy/Runtime |
| Prisma / Supabase | Count = **0** (inherited from Storage) |

**Forbidden (merge blockers):** UI toggles that mutate Feature/Policy/Kill without GovernanceAPI · engine side effects that skip `admit()` · Kill Switch that does not cancel work · Feature flags only in renderer · Policy stored only as ad-hoc Config keys · Bypassing Governor for “local quick jobs”.

---

## 1. Layer semantics (aligned with RFC 13)

```text
Feature → Policy → Runtime(Governor + Kill Switch)
         ↘ Capability Matrix (Account) when platform side effect
```

| Layer | Responsibility | Deny code | Typical terminal hint |
|---|---|---|---|
| **Feature** | Lifecycle enablement: `enabled` / `disabled` / `experimental` / `beta` / `hidden` | `FEATURE_DISABLED` | `BLOCKED_POLICY` |
| **Policy** | Time/budget/retry/human-approval / validate gates (JSON rules) | `POLICY_DENIED` | `BLOCKED_POLICY` / `BLOCKED_HUMAN` |
| **Capability** | Account Matrix (`canPublish` / `publishMode` / `riskLevel`) — port; full Account in Phase B | `CAPABILITY_DENIED` | `BLOCKED_CAPABILITY` |
| **Runtime / Governor** | Admission (concurrency · cost envelopes · Kill Switch) | `GOVERNOR_THROTTLED` / `KILL_SWITCH` | `BLOCKED_POLICY` / (kill → `CANCELLED`) |

### Resolution / cascade (V1)

```text
License(default Developer) → Admin/Owner → Project → User → Policy → Capability → Governor
```

Settings cascade for **prefs** remains Global → Project → User (`settingsScope`).  
Feature/Policy/Kill rows use the same scopes; effective Feature lifecycle = **most specific winning scope** (user > project > global) when present; missing row falls back to outer scope; if none → treat as **disabled** (fail closed).

### Runtime check pipeline (mandatory)

For each Command / external side effect:

```text
Kill Switch inactive?
  → Feature allows (lifecycle admits)?
    → Policy allows (enabled rules)?
      → Capability allows (if platform side effect)?
        → Governor admits?
          → Execute
        else → deny (GOVERNOR_THROTTLED) + audit + event
```

Kill Switch is checked **first** (fail closed). Denials always carry `traceId` and append thin `AuditEvent`.

---

## 2. Persistence mapping (13 ↔ Storage 14 / S2A)

| Governance concept | Entity | SQL table | Repository port |
|---|---|---|---|
| Feature lifecycle | `FeatureState` | `feature_state` | `FeatureRepository` |
| Policy document | `PolicyRule` | `policy_rule` | `PolicyRepository.putRule` / `listRules` |
| Kill Switch | `KillSwitchState` | `kill_switch_state` | `PolicyRepository.getKillSwitch` / `setKillSwitch` |
| Thin audit | `AuditEvent` | `audit_event` | `AuditRepository` |
| Cancelled work | `WorkflowRun.state` | `workflow_run` | `WorkflowRunRepository.transition(..., "CANCELLED")` |
| Cancelled leases | `PlannerQueueItem.status` | `planner_queue_item` | `PlannerQueueRepository` (+ `listByProject` for cancel scan) |

### 2.1 Column → semantics

**`feature_state`**

| Column | Governance meaning |
|---|---|
| `feature_key` | Stable key (`feature.*`) — V1 seed set from Storage defaults |
| `scope` / `scope_id` | Cascade locus |
| `lifecycle` | Feature layer state (`featureLifecycle` enum in `@clime/shared`) |

Lifecycle admit rules (V1):

| lifecycle | `admit()` Feature layer |
|---|---|
| `enabled` | allow |
| `experimental` | allow (may be Policy-constrained later) |
| `beta` | allow |
| `disabled` | deny `FEATURE_DISABLED` |
| `hidden` | deny `FEATURE_DISABLED` (not shown as actionable in UI) |

**`policy_rule`**

| Column | Governance meaning |
|---|---|
| `feature_key` | null = baseline/global rule; else binds to Feature |
| `rule_json` | Zod envelope + `schema_version` (kinds below) |
| `enabled` | 0 = skip rule |

**`kill_switch_state`**

| Column | Governance meaning |
|---|---|
| `active` | 1 = Runtime hard stop |
| `reason` | human-safe reason |
| `activated_at` | ISO timestamp when activated |

---

## 3. Policy `rule_json` kinds (V1 lean)

All envelopes: `{ schema_version: 1, kind: string, ... }`.

| `kind` | Fields (normative) | Deny when |
|---|---|---|
| `baseline` | `pauseOnChallenge: boolean`, `maxRetries: number`, `humanApprovalRequired: boolean` | `humanApprovalRequired === true` and command lacks `humanApproved` |
| `publish_gate` | `requireValidate: boolean`, `requireCapability: boolean` | publish command with `validated !== true` when `requireValidate`; or missing capability check when required |
| `governor_limits` (optional) | `maxConcurrentRuns?: number`, `maxCostUnits?: number` | active non-terminal runs ≥ max (Governor) |

Unknown `kind` → ignore for admit (forward-compatible); malformed / missing `schema_version` → **deny** `POLICY_DENIED` (fail closed at boundary parse).

Seed rows (already in `@clime/storage` seed) remain authoritative defaults — feature-management must not invent a parallel seed store.

---

## 4. Package layout (`s2.5-b` must create)

```text
packages/feature-management/
  package.json                 # @clime/feature-management
  tsconfig.json
  vitest.config.ts
  src/
    index.ts                   # public factory + types only
    types.ts                   # AdmitDecision, events, DTOs
    zod/
      policy-rule.ts           # rule_json kinds
      governance.ts            # mutation/query envelopes where needed
    runtime/
      admit.ts                 # Feature→Policy→Capability→Governor pipeline
      resolve-feature.ts       # scope cascade
      governor.ts              # lean admission + kill switch
    persist/
      ports.ts                 # deps = storage repos (+ optional ports)
    api/
      governance-api.ts        # GovernanceAPI method surface (Domain API wraps later)
    kill-switch/
      activate.ts              # persist + cancel work + audit + event
      cancel-work.ts           # Workflow CANCELLED + queue cancelled
    events.ts                  # event name constants (System bus names)
  *.test.ts
```

### Dependency law

- **Allowed:** `@clime/shared`, `@clime/storage` (types + Repository usage via injected `ClimeStorage` / ports), `zod`
- **Forbidden (not Prisma / not Supabase):** `drizzle-orm`, `better-sqlite3`, `@prisma/*`, `@supabase/*`, UI packages, direct Electron

---

## 5. Public API (frozen names)

```ts
export type GovernanceDenyCode =
  | "FEATURE_DISABLED"
  | "POLICY_DENIED"
  | "CAPABILITY_DENIED"
  | "GOVERNOR_THROTTLED"
  | "KILL_SWITCH"
  | "VALIDATION_FAILED";

export type AdmitInput = {
  featureKey: string;
  projectId?: string | null;
  userKey?: string | null;
  traceId: string;
  /** Platform side effect → Capability port required when policy/feature demands */
  platformSideEffect?: boolean;
  accountId?: string | null;
  humanApproved?: boolean;
  validated?: boolean;
  /** Optional cost units proposed by Cost Intelligence (later); Governor may use */
  costUnits?: number;
};

export type AdmitDecision =
  | { ok: true; traceId: string }
  | {
      ok: false;
      code: GovernanceDenyCode;
      message: string;
      traceId: string;
      terminalHint?:
        | "BLOCKED_POLICY"
        | "BLOCKED_HUMAN"
        | "BLOCKED_CAPABILITY"
        | "CANCELLED";
    };

/** Optional ports — full Account/Automation arrive in later slices */
export interface CapabilityPort {
  allowsPublish(input: {
    accountId: string;
    publishMode?: "api" | "session";
  }): Promise<{ ok: true } | { ok: false; reason: string }>;
}

export interface GovernorMetricsPort {
  countActiveRuns(projectId: string | null): Promise<number>;
}

export interface SystemEventSink {
  emit(event: {
    type:
      | "FeatureFlagDenied"
      | "PolicyDenied"
      | "GovernorThrottled"
      | "KillSwitchActivated"
      | "KillSwitchCleared";
    traceId: string;
    payload: Record<string, unknown>;
  }): void | Promise<void>;
}

export interface GovernanceAPI {
  // Queries — UI may call via Domain API (display)
  getFeatures(input: {
    scope?: "global" | "project" | "user";
    scopeId?: string | null;
  }): Promise<FeatureStateView[]>;
  getPolicies(input: {
    scope?: string;
    scopeId?: string | null;
  }): Promise<PolicyRuleView[]>;
  getKillSwitch(input: {
    scope: string;
    scopeId?: string | null;
  }): Promise<KillSwitchView | null>;
  getRuntimeStatus(input: {
    projectId?: string | null;
  }): Promise<RuntimeStatusView>;

  // Mutations — admin/owner path only; UI must not invent another writer
  setFeature(input: {
    featureKey: string;
    scope: "global" | "project" | "user";
    scopeId?: string | null;
    lifecycle: FeatureLifecycle;
    actor?: string | null;
    traceId: string;
  }): Promise<{ id: string }>;
  setPolicy(input: {
    id?: string;
    featureKey?: string | null;
    scope: string;
    scopeId?: string | null;
    ruleJson: string; // envelope; Zod-validated
    enabled: boolean;
    actor?: string | null;
    traceId: string;
  }): Promise<{ id: string }>;
  activateKillSwitch(input: {
    scope: string;
    scopeId?: string | null;
    reason: string;
    actor?: string | null;
    traceId: string;
    /** When set, cancel work for this project; when null + global, cancel all projects */
    projectId?: string | null;
  }): Promise<{
    cancelledWorkflowRunIds: string[];
    cancelledQueueItemIds: string[];
  }>;
  clearKillSwitch(input: {
    scope: string;
    scopeId?: string | null;
    actor?: string | null;
    traceId: string;
  }): Promise<void>;

  /** Runtime gate — engines MUST call before side effects */
  admit(input: AdmitInput): Promise<AdmitDecision>;
}

export function createFeatureManagement(deps: {
  storage: Pick<
    ClimeStorage,
    | "features"
    | "policies"
    | "audit"
    | "workflowRuns"
    | "plannerQueue"
    | "projects"
  >;
  capability?: CapabilityPort;
  governorMetrics?: GovernorMetricsPort;
  events?: SystemEventSink;
}): GovernanceAPI;
```

View DTOs are plain serializable objects (no Drizzle row leakage required; mapping from rows OK).

---

## 6. Kill Switch → `CANCELLED` path (normative)

On `activateKillSwitch`:

1. Persist `kill_switch_state.active = 1` (+ reason, `activated_at`).
2. Select work to cancel:
   - **WorkflowRun:** all non-terminal states for target project(s) → `transition(id, "CANCELLED")`.  
     Terminals (do not touch): `PUBLISHED`, `FAILED`, `CANCELLED`.  
     Non-terminal includes: `QUEUED`, `RUNNING`, `VALIDATING`, `OPTIMIZING`, `READY`, `BLOCKED_*`, `PAUSED_CHALLENGE`.
   - **PlannerQueueItem:** items with `status === "leased"` (and optionally `ready` / `running` if used) → `updateStatus(id, "cancelled")`.  
     Requires Storage `PlannerQueueRepository.listByProject(projectId, limit)` (additive; s2.5-b may add this single method if missing).
3. `AuditRepository.append` with kind `kill_switch.activated` + envelope (`schema_version`).
4. `SystemEventSink.emit({ type: "KillSwitchActivated", ... })`.

On `clearKillSwitch`: set `active = 0`, audit `kill_switch.cleared`, emit `KillSwitchCleared`. Does **not** revive cancelled jobs.

While Kill Switch active, `admit()` returns `{ ok: false, code: "KILL_SWITCH", terminalHint: "CANCELLED" }` for all feature keys.

---

## 7. UI vs GovernanceAPI

| Actor | Allowed |
|---|---|
| Renderer / `@clime/ui` | Read models (flags, kill banner, runtime status) via Domain API queries only |
| Renderer | **Must not** import `@clime/feature-management` persist internals or call Storage Feature/Policy repos |
| Main / Domain API host (slice 3) | Wraps `GovernanceAPI` mutations + `admit` for Commands |
| Engines (workflow/automation/content/…) | Call `admit()` before side effects; never fork a second gate |

Until Domain API exists, tests and temporary main wiring may construct `createFeatureManagement` directly — still the **same** mutation surface.

---

## 8. Events (System bus names — RFC 13)

| Event | When |
|---|---|
| `FeatureFlagDenied` | Feature layer deny |
| `PolicyDenied` | Policy layer deny |
| `GovernorThrottled` | Governor deny |
| `KillSwitchActivated` | Kill activate |
| `KillSwitchCleared` | Kill clear |

Event bus package is slice 3; V1 here uses injectable `SystemEventSink` (no-op default). Names stay frozen for bus wiring.

---

## 9. Explicit non-goals (out of 2.5)

- Full Domain API IPC host / 4 buses (slice 3)
- Deep Permission / multi-tier License Manager / Marketplace
- Real CPU/GPU Resource Scheduler (Automation B3) — Governor stays lean (kill + optional concurrency)
- Capability Matrix implementation (Account B1) — port only
- UI screens for Feature admin (later Settings/Mission surfaces)

---

## 10. Prove checklist (for `s2.5-c`)

- [x] `@clime/feature-management` exists; no drizzle/sqlite/prisma/supabase deps
- [x] Persist only through Storage repos (`FeatureState` / `PolicyRule` / `KillSwitchState` / `AuditEvent`)
- [x] `admit()` enforces Feature → Policy → Capability → Governor; deny paths audited
- [x] Kill Switch activate → workflow `CANCELLED` + queue `cancelled` + `KillSwitchActivated` (+ audit)
- [x] Runtime 미통과 실행 0 — tests prove side-effect helper refuses without `admit` ok
- [x] Mutations only on `GovernanceAPI`; document/tests assert UI-display-only contract
- [x] Mapping matches RFC 13 + Storage tables (this contract §2)
- [x] `pnpm lint` / `typecheck` / `test` GREEN

Full stamp → [`S25C_GOVERNANCE_PROVE.md`](S25C_GOVERNANCE_PROVE.md).

---

## 11. Handoff

| Field | Value |
|---|---|
| Contract id | `s2.5-a` |
| Implement | `s2.5-b` — **done** (`packages/feature-management`) |
| Prove | `s2.5-c` — **GREEN** |
| Next to-do | `s3-a` → **done**; implement Domain API host in `s3-b` |
| Recommended model | GROK4.5 |
| Do not | Domain API package scope creep into Feature · UI Feature admin without GovernanceAPI · Prisma/Supabase · skip `admit()` |
