# 13 — Governance: Feature → Policy → Runtime (+ Extensions)

**Status:** Phase 0 RFC  
**Package:** `packages/feature-management/` (name may evolve; concept locked)  
**V1 core:** Feature → Policy → Runtime — not a 12-headed mega-layer on day one.

---

## 1. V1 core

```text
Feature → Policy → Runtime
```

| Layer | Responsibility |
|---|---|
| **Feature** | Enable/lifecycle: Enabled / Disabled / Experimental / Beta / Hidden (Deprecated/Removed later) |
| **Policy** | Time window, budget/token/cost limits, human approval, retry/pause |
| **Runtime** | Governor admission (concurrency, CPU/GPU%, cost) + **Kill Switch** |

Compose with **Capability Matrix** (Account) for effective publish.

### Resolution order (V1)

```text
License(default Developer) → Admin/Owner → Project → User → Policy → Capability → Governor
```

---

## 2. Extensions (progressive — same package family)

| Extension | V1 stance |
|---|---|
| Permission Manager | Thin / later deepen |
| License Manager (multi-tier) | Default Developer; expand later |
| Dependency Graph UI | Later |
| Deep Audit UI | Thin logs first |
| Health dashboards | Thin first |
| Plugin Marketplace | L+ |

Extensions **plug onto** the three-core; they do not block V1 ship.

---

## 3. Settings cascade

```text
Global → Project → User
```

- **Workspace** deferred to Team Mode (L+)  
- Admin/Owner ≈ Global+Project governance  
- User = UI prefs only  

Config package stores values; Governance stores Feature/Policy/Runtime state.

---

## 4. Module Registry (lean)

**Registry row:** `ID · Version · Dependencies · Lifecycle`  
**Manifest sidecar:** Name, Author, Description, Permission, License, Settings Schema, Events, Runtime hints  

Every unit registers (Feature Acceptance Gate #12).

---

## 5. Controllable surfaces

Engines, research sources, content channels, analytics modules, AI models (priority/cost/fallback/tokens), connector ops, workflows, workers — all Feature+Policy+Runtime.

Start with essential keys; expand schema via JSON.

---

## 6. Governor

- Admits work based on concurrency, CPU/GPU%, cost envelopes  
- Works with Resource Scheduler (Automation)  
- Emits `GovernorThrottled` (System bus)  
- Cost Intelligence proposes; Governor admits  

---

## 7. Kill Switch

- Required in V1  
- Cancels leased jobs → Workflow `CANCELLED`  
- Emits `KillSwitchActivated`  
- Blocking UI banner via Domain API event forward  
- Audit thin log entry mandatory  

---

## 8. Runtime check pipeline

For each Command / external side effect:

```text
Feature enabled?
  → Policy allows (time/budget/human)?
    → Capability allows (if platform side effect)?
      → Governor admits?
        → Execute
```

Denials logged with Trace ID (Acceptance Gate #8, #13, #14).

---

## 9. Learning ↔ Policy

Learning may propose Policy updates. Auto-apply only above Confidence threshold; else Inbox proposal. See `11_MEMORY_KNOWLEDGE.md`.

---

## 10. Domain API

`GovernanceAPI.getFeatures|setFeature|getPolicies|setPolicy|getKillSwitch|activateKillSwitch|getRuntimeStatus`

Admin/Owner only for mutations in V1 single-user mode (still check locally).

---

## 11. Events

| Event | Bus |
|---|---|
| `FeatureFlagDenied` | System |
| `PolicyDenied` | System |
| `GovernorThrottled` | System |
| `KillSwitchActivated` | System |
| `KillSwitchCleared` | System |

---

## 12. License (V1 light)

Default **Developer** local license. Multi-tier License Manager is an extension — resolution order still mentions License for forward compatibility.

---

## 13. Anti-patterns

1. Building Permission+License+Audit+Health+Marketplace before Feature/Policy/Runtime works  
2. Feature flags only in UI with no Runtime enforcement  
3. Kill Switch that doesn’t cancel workers  
4. Policy stored only in ad-hoc Config keys without schema  
5. Bypassing Governor for “local quick jobs”  

---

## 14. Cross-references

- Constitution gates → `02_CONSTITUTION.md`
- Capability → `10_ACCOUNT.md`
- Buses/Obs → `12_INFRASTRUCTURE.md`
- Learning proposals → `11_MEMORY_KNOWLEDGE.md`
- Roadmap Phase A → `15_DESKTOP_AND_ROADMAP.md`

---

## 15. Acceptance (Phase 0)

- [x] Feature→Policy→Runtime core
- [x] Resolution order
- [x] Kill Switch required
- [x] Extensions deferred clearly
- [x] Settings Global→Project→User
