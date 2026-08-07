# X-A Fortification Master Contract (FROZEN)

**Status:** FROZEN — plan to-do `x-a` (GROK4.5/256K); **code = 0** (this file only)  
**Normative for:** all owning to-dos below (`s2-e-*`, `b3-*`, `c2-*`, `b1-c`, `f-b`, `s4-*`, `s4.5-*`, `h-b`, and residual Resource Governor work) — implement **under their slice contracts**; do **not** re-implement fortification elsewhere  
**Cross-prove:** `x-b` (GROK4.5) — full 6-category audit immediately before `v1-a`  
**SSOT parents:** plan Fortification section; [`02_CONSTITUTION.md`](../architecture/02_CONSTITUTION.md), [`05_WORKFLOW.md`](../architecture/05_WORKFLOW.md), [`07_AI.md`](../architecture/07_AI.md), [`10_ACCOUNT.md`](../architecture/10_ACCOUNT.md), [`12_INFRASTRUCTURE.md`](../architecture/12_INFRASTRUCTURE.md), [`13_GOVERNANCE.md`](../architecture/13_GOVERNANCE.md), [`14_DATABASE.md`](../architecture/14_DATABASE.md); frozen peers [`S2A_STORAGE_CONTRACT.md`](S2A_STORAGE_CONTRACT.md), [`S25A_GOVERNANCE_CONTRACT.md`](S25A_GOVERNANCE_CONTRACT.md), [`S3A_DOMAIN_API_CONTRACT.md`](S3A_DOMAIN_API_CONTRACT.md)

---

## 0. Locks (non-negotiable)

| Lock | Rule |
|---|---|
| Ownership | Each control has **exactly one** owning to-do chain — **duplicate implementation = merge blocker** |
| Scope of `x-a` | **Document only** — no packages, migrations, or runtime code in this to-do |
| Scope of `x-b` | **Prove only** — no new features; stamp GREEN/FAIL against this contract |
| SQLite V1 | WAL + single-writer discipline via Repository mutex; engines never open SQLite |
| Task SM | Optimistic concurrency on WorkflowRun transitions; terminals frozen in Constitution / `05` |
| Publish abuse | Gaussian jitter + daily quota + challenge → `PAUSED_CHALLENGE` + Inbox; **bypass / captcha solve = 0** |
| UI thread | Long work returns **`jobId` immediately**; UI must not await completion on IPC ([`S3A`](S3A_DOMAIN_API_CONTRACT.md)) |
| Secrets | Vault / OS keychain; plaintext secret in git / Config / logs = **0** |
| Spend | Paid Ads / spend-like experiment actions = **HumanGate only** |
| AI vendors | Circuit breaker + fallback **behind Adapters** only (`packages/ai`); domain code never imports vendor SDKs |
| Trace | Partial failure / throttle / challenge / kill paths always expose or persist **`traceId`** |

**Forbidden (merge blockers):** Second WAL/mutex layer outside `@clime/storage` · Worker lease logic outside Automation · Publish jitter/quota outside Publish/BAE path · Circuit breaker in domain engines · Captcha bypass / fingerprint spoof / proxy identity laundering · Silent `posted_*` after challenge · Prisma / Supabase product paths.

---

## 1. Master map — 6 categories → owning to-do ids

| § | Category | Core controls (summary) | Owning to-do ids | Slice contracts (when written) |
|---|---|---|---|---|
| **1** | Concurrency & Locking | SQLite WAL + immediate txn · Repo async mutex · Task SM optimistic lock (`updated_at`+`version`) · Worker `lease_expires_at` + heartbeat | `s2-e-a` → `s2-e-c` · `b3-a` → `b3-c` (prove `b3-d`) | [`S2EA`](S2EA_STORAGE_HARDENING_CONTRACT.md) **FROZEN**; `b3-a` Workflow/Automation |
| **2** | Anti-Abuse & Rate Limits | Gaussian jitter **5–45s** · daily quota · `PAUSED_CHALLENGE` + Inbox · session sandbox per account | `c2-a` → `c2-c` (prove `c2-d`) · `b1-c` · `f-b` (prove `f-c`) | `c2-a` Publish ladder; Account sandbox in B1; challenge E2E in F |
| **3** | Resource Governor | IPC `jobId` non-block · Governor throttle · concurrency / CPU·RAM caps | `s3-a` → `s3-e` **(DONE)** · `s2.5-b` **(DONE lean)** · `b3-c` (prove `b3-d`) | Domain API + Governance already frozen; Worker Resource Scheduler in B3 |
| **4** | Data Integrity | Zod + `schema_version` · outbox atomic enqueue · partial failure safe-stop + `traceId` | `s2-e-a` / `s2-e-b` · `b3-b` · `b3-c` (prove `s2-e-c`, `b3-d`) | [`S2EA`](S2EA_STORAGE_HARDENING_CONTRACT.md) **FROZEN** + Workflow/Automation |
| **5** | Security Shield | Vault keychain / encrypted session · plaintext **0** · HumanGate on spend | `s4-a` → `s4-d` · `h-b` (prove `h-c`) | Vault/Session/Config; Experiment spend gate in H |
| **6** | Fault Tolerance (LLM) | Circuit breaker · fallback chain (cloud→Ollama) · exponential backoff | `s4.5-a` → `s4.5-c` | AI Adapter + Cost |

**Split rule for §1 / §4:** Storage Hardening (`s2-e`) owns WAL, journal mode, repo mutex, and **transactional outbox enqueue hook**. Workflow/Automation (`b3`) owns optimistic SM lock, lease heartbeat, outbox **publisher worker**, and partial-failure node stop. Do not move either half.

**Already satisfied (do not re-open):**

| Control | Evidence |
|---|---|
| Boundary Zod + `schema_version` (base) | `s2-d` / [`S2D_STORAGE_PROVE.md`](S2D_STORAGE_PROVE.md) |
| `admit()` + Kill Switch cancel leased work | `s2.5-c` / [`S25C_GOVERNANCE_PROVE.md`](S25C_GOVERNANCE_PROVE.md) |
| IPC `jobId` immediate + UI bus subscribe = 0 | `s3-e` / [`S3E_DOMAIN_API_PROVE.md`](S3E_DOMAIN_API_PROVE.md) |

Hardening gaps for `x-b`: **closed** — full 6-category cross-prove GREEN ([`XB_FORTIFICATION_PROVE.md`](XB_FORTIFICATION_PROVE.md)).

---

## 2. Category §1 — Concurrency & Locking

### 2.1 Controls

| Control | Normative behavior | Owner |
|---|---|---|
| **WAL** | SQLite `journal_mode=WAL` (and durable sync policy documented in `s2-e-a`) on product DB open | `s2-e-a`→`b` |
| **Immediate txn** | Writers use BEGIN IMMEDIATE (or equivalent) so lock acquisition fails fast under contention | `s2-e-a`→`b` |
| **Repo async mutex** | All Repository mutating paths serialize through one async mutex/queue per DB handle — no parallel writers racing | `s2-e-a`→`b` |
| **Optimistic SM lock** | WorkflowRun transition checks `version` and/or `updated_at`; conflict → no silent overwrite; caller retries or fails with `traceId` | `b3-a`→`b` |
| **Lease + heartbeat** | Queue lease sets `lease_expires_at`; worker heartbeats; expired lease → requeue / reassign (zombie reclaim) | `b3-a`→`c` |

### 2.2 Acceptance criteria (owners must prove; `x-b` rechecks)

- [x] Product DB opens with WAL; test or assert journal mode (`s2-e-c`)
- [x] Concurrent repo writes do not corrupt rows (mutex / IMMEDIATE covered by tests) (`s2-e-c`)
- [x] Two conflicting SM transitions: at most one wins; loser gets explicit conflict / retry path (`b3-d`)
- [x] Expired lease without heartbeat is reclaimable; no permanent zombie `leased` items (`b3-d`)
- [x] Engines still never import Drizzle/SQLite (inherited Storage lock) (`s2-e-c` / `s2-d`)

### 2.3 Explicit non-goals for §1

- Distributed locks / multi-process SQLite writers
- Postgres/Supabase concurrency (V1 out of scope)
- UI-thread locking

---

## 3. Category §2 — Anti-Abuse & Rate Limits

### 3.1 Controls

| Control | Normative behavior | Owner |
|---|---|---|
| **Gaussian jitter** | Inter-publish / session-action delay sampled ~**5–45 seconds** (Gaussian clamped to range); no fixed metronome | `c2-a`→`c` |
| **Daily quota** | Per-account (and/or per-project) publish/action caps; exceed → deny / defer with honest Matrix/Inbox — not silent drop | `c2-a`→`c` |
| **Challenge pause** | captcha/challenge/lock → Task terminal **`PAUSED_CHALLENGE`** + Inbox; **no** solve/bypass CTA or code | `c2-a`→`c` · E2E `f-b` |
| **Session sandbox** | Per-account browser/session isolation for BAE/session publish; no cross-account cookie jar sharing | `b1-c` (+ used by `c2`) |

### 3.2 Acceptance criteria

- [x] Publish ladder documents API→session; session path applies jitter + quota (`c2-d`)
- [x] Challenge detection never records success `posted_*` without pause path (`c2-d` / `f-c`)
- [x] Inbox surfaces pause with `traceId`; UI has zero bypass CTA (`b2` surfaces + `f-b` E2E) (`f-c`)
- [x] Sandbox skeleton exists and is the only session home for publish automation (`b1-d` / `c2-d`)
- [x] Captcha bypass / fingerprint spoof / proxy identity laundering code count = **0** (`x-b`)

### 3.3 Explicit non-goals for §2

- Full anti-bot research platform
- Paid proxy farm / residential IP rotation product
- Spam botnet scale

---

## 4. Category §3 — Resource Governor

### 4.1 Controls

| Control | Normative behavior | Owner |
|---|---|---|
| **jobId non-block** | `[A]` Domain API methods return `{ jobId }` immediately; progress via Notification/Inbox | `s3-*` **DONE** |
| **Governor admit** | Commands/side effects pass `admit()`; throttle → `GOVERNOR_THROTTLED` + System `GovernorThrottled` | `s2.5-*` **DONE** (lean) |
| **Worker concurrency / resource caps** | Automation Worker Runtime concurrency **max 2–3** (V1 default); CPU/RAM (/GPU/token) budgets under Resource Scheduler + Governor | `b3-c` |

### 4.2 Acceptance criteria

- [x] Long IPC work returns `jobId` without blocking renderer completion await (`s3-e`)
- [x] `admit()` gate before side effects; Kill Switch cancels leased work (`s2.5-c`)
- [x] Worker pool honors concurrency cap; overload → throttle / queue, not UI freeze (`b3-d`)
- [x] AI/publish/research heavy work never runs on renderer thread (`b3-d` — Workers in main/automation only)

### 4.3 Explicit non-goals for §3

- Perfect OS-level cgroup isolation
- Multi-machine scheduler
- Replacing Feature→Policy with “just Governor”

---

## 5. Category §4 — Data Integrity

### 5.1 Controls

| Control | Normative behavior | Owner |
|---|---|---|
| **Zod + `schema_version`** | All boundary JSON (IPC, DSL, outbox payload, knowledge blobs) validated; missing `schema_version` = reject | Base `s2` **DONE**; hardening keeps it |
| **Outbox atomic** | Domain-fact write + `EventOutbox` enqueue in **one** DB transaction (same mutex/txn) | `s2-e-a`→`b` |
| **Outbox publisher** | Worker drains pending outbox at-least-once; marks published/failed with attempts | `b3-c` |
| **Partial failure + traceId** | Node/job failure stops safely (no fake PUBLISHED); error surfaces `traceId`; Validate skip = **0** | `b3-b` |

### 5.2 Acceptance criteria

- [x] Crash between domain write and outbox enqueue cannot leave “committed fact, no outbox” (atomic txn test) (`s2-e-c`)
- [x] Publisher recovers pending rows after restart (`b3-d` — pending drain after recreate)
- [x] Workflow partial failure leaves SM in honest terminal / pause — not `PUBLISHED` (`b3-d`)
- [x] Validate remains mandatory before Optimize/Publish (`b3-d` SM gate; Content C1 fills real validate)

### 5.3 Explicit non-goals for §4

- Exactly-once bus delivery (at-least-once + idempotent consumers is enough)
- Full event sourcing rewrite

---

## 6. Category §5 — Security Shield

### 6.1 Controls

| Control | Normative behavior | Owner |
|---|---|---|
| **Vault** | OS keychain and/or encrypted vault; Config holds **refs/values only** | `s4-a`→`b` |
| **Session at rest** | Session material encrypted; `SessionExpired` on lifecycle end | `s4-a`→`b` |
| **Plaintext = 0** | No secrets in git, Config plaintext fields, or log lines | `s4-c`→`d` |
| **Config ≠ Governance** | Kill Switch / Feature / Policy never stored as ad-hoc Config keys | `s4-a`→`d` |
| **HumanGate spend** | Paid Ads / spend-like experiment actions require human approval; auto-spend = **0** | `h-b` (+ Constitution) |

### 6.2 Acceptance criteria

- [x] Vault package exists; product secrets only via vault refs (`s4-d`)
- [x] Grep/audit: no committed API keys / session tokens / `.env` secrets in repo (`s4-d`)
- [x] `SessionExpired` emitted and surfaced (Inbox path when Notification exists) (`s4-d` / B2)
- [x] Experiment / Ads spend UI or API path is HumanGate-only (or not exposed) (`h-c`)
- [x] Config cascade cannot activate Kill Switch / Feature lifecycle (`s4-d`)

### 6.3 Explicit non-goals for §5

- Enterprise HSM / SSO IdP (L+)
- Team Mode / Workspace admin before L+

---

## 7. Category §6 — Fault Tolerance (LLM)

### 7.1 Controls

| Control | Normative behavior | Owner |
|---|---|---|
| **Circuit breaker** | Per-provider (or per-adapter) breaker opens on error/timeout burst; short-circuits until half-open probe | `s4.5-a`→`b` |
| **Fallback chain** | Task-class chain e.g. cloud → alternate cloud → **Ollama**; domain code unaware of vendor | `s4.5-a`→`b` |
| **Exponential backoff** | Retries use exponential backoff (+ jitter optional); honor Policy max retries | `s4.5-a`→`b` |
| **Cost path** | Cost Intelligence lives in `packages/ai` — **not** Meta | `s4.5-a`→`c` |
| **Vault ref for keys** | Adapter credentials = vault refs only | `s4.5` + `s4` |

### 7.2 Acceptance criteria

- [x] Open breaker prevents stampede; fallback still serves when chain allows (`s4.5-c`)
- [x] Domain / Growth / Content packages have **zero** vendor SDK imports (`s4.5-c`)
- [x] Provider outage → usable degraded path or honest failure with `traceId` (no UI hang) (`s4.5-c`)
- [x] Cost decisions not owned by `packages/meta` (`s4.5-c`)

### 7.3 Explicit non-goals for §6

- Multi-region active-active LLM mesh
- Fine-tuning / eval platform in V1

---

## 8. Cross-slice dependency order (fortification only)

```text
x-a (this contract) FROZEN
  → s2-e-a → s2-e-b → s2-e-c     # WAL · mutex · outbox atomic
  → s4-a → … → s4-d               # Vault · Session · Config
  → s4.5-a → … → s4.5-c           # Circuit breaker · fallback
  → b1-c                            # Session sandbox skeleton
  → b3-a → b3-b → b3-c → b3-d     # Optimistic lock · lease · Governor workers · outbox publish
  → c2-a → … → c2-d               # Jitter · quota · PAUSED_CHALLENGE
  → f-b → f-c                     # Challenge E2E
  → h-b → h-c                     # HumanGate spend seat
  → x-b                           # Full 6-category cross-prove (before v1-a)
```

`s2-e` may start immediately after `x-a` (plan: “`x-a` 직후 또는 `b3` 직전”). Prefer **`x-a` 직후** so Storage hardening lands before Workflow leases depend on it.

---

## 9. V1 Definition of Done — Fortification clause (maps to `x-b`)

From program V1 DoD — **all** must be GREEN at `x-b`:

| DoD bullet | Categories |
|---|---|
| WAL + mutex | §1 (`s2-e`) |
| Optimistic lock + lease heartbeat | §1 (`b3`) |
| Jitter + quota | §2 (`c2`) |
| UI non-block + Governor | §3 (`s3` + `s2.5` + `b3-c`) |
| Outbox atomic | §4 (`s2-e` + publisher `b3-c`) |
| Vault | §5 (`s4`) |
| Circuit breaker + fallback | §6 (`s4.5`) |
| (+ challenge pause / HumanGate / no bypass) | §2 · §5 |

---

## 10. `x-b` Prove checklist — **STAMPED GREEN** ([`XB_FORTIFICATION_PROVE.md`](XB_FORTIFICATION_PROVE.md))

### §1 Concurrency & Locking

- [x] WAL + IMMEDIATE + repo mutex GREEN (`s2-e-c`)
- [x] Optimistic SM lock GREEN (`b3-d`)
- [x] Lease heartbeat / zombie reclaim GREEN (`b3-d`)

### §2 Anti-Abuse & Rate Limits

- [x] Gaussian jitter 5–45s + daily quota GREEN (`c2-d`)
- [x] Session sandbox wired (`b1-d` / `c2-d`)
- [x] Challenge → `PAUSED_CHALLENGE` + Inbox E2E; bypass 0 (`f-c`)

### §3 Resource Governor

- [x] jobId non-block still GREEN (`s3-e` evidence retained)
- [x] Governor admit retained (`s2.5-c`)
- [x] Worker concurrency / resource caps GREEN (`b3-d`)

### §4 Data Integrity

- [x] Outbox atomic enqueue GREEN (`s2-e-c`)
- [x] Outbox publisher + partial failure + `traceId` GREEN (`b3-d`)

### §5 Security Shield

- [x] Vault / Session / plaintext 0 / Config≠Governance GREEN (`s4-d`)
- [x] HumanGate spend seat GREEN (`h-c`)

### §6 Fault Tolerance

- [x] Circuit breaker + fallback + backoff + Adapter-only GREEN (`s4.5-c`)

### Meta

- [x] No duplicate fortification implementations outside owning packages
- [x] `pnpm lint` / `typecheck` / `test` GREEN at prove time
- [x] Captcha bypass / Prisma / Supabase product paths still **0**

Full stamp → [`docs/appendix/XB_FORTIFICATION_PROVE.md`](XB_FORTIFICATION_PROVE.md) (`x-b` GREEN).

---

## 11. Anchor convention for future contracts

When writing a slice-A contract that owns a fortification control, cite this file:

```text
(x-a §N)  — N = 1..6 category number above
```

Examples already reserved in the plan:

| To-do | Anchor |
|---|---|
| `s2-e-a` | `(x-a §1` storage half + `§4` outbox atomic`)` |
| `b3-a` | `(x-a §1` SM/lease + `§4` publisher/partial`)` |
| `c2-a` | `(x-a §2)` |
| `s4.5-a` | `(x-a §6)` |
| `s4-a` | `(x-a §5)` |

Child contracts may refine APIs/columns; they **must not** change ownership or weaken acceptance criteria without amending this master file in a GROK session.

---

## 12. Explicit non-goals of `x-a` itself

- Any TypeScript / migration / CI YAML
- Viral Growth controls (owned by `vg-a`→`e`, separate SSOT)
- Replacing RFCs — this contract **binds ownership + acceptance**; RFC detail remains in `docs/architecture/*`
- Implementing Worker Runtime, Publish ladder, or Vault (downstream to-dos)

---

## 13. Handoff

| Field | Value |
|---|---|
| Contract id | `x-a` |
| Artifact | [`XA_FORTIFICATION_CONTRACT.md`](XA_FORTIFICATION_CONTRACT.md) |
| Cross-prove | `x-b` **GREEN** — [`XB_FORTIFICATION_PROVE.md`](XB_FORTIFICATION_PROVE.md) |
| Storage hardening | `s2-e-a`→`c` **DONE GREEN** — [`S2EA`](S2EA_STORAGE_HARDENING_CONTRACT.md) + [`S2EC`](S2EC_STORAGE_HARDENING_PROVE.md) |
| Next to-do (plan order) | `v1-a` (GROK4.5) — V1 Acceptance / DoD sign-off |
| Recommended model (next) | **GROK4.5** for `v1-a` |
| Do not | Re-open fortification ownership · Duplicate WAL/mutex in engines · Weaken acceptance without amending this master file |
