# C2-A Publish Ladder Contract (FROZEN)

**Status:** FROZEN — plan to-do `c2-a` (GROK4.5/256K); **Prove** in `c2-d`  
**Normative for:** `c2-b` (BAE home + Playwright boundary) / `c2-c` (API + session paths + Matrix) — implement **this file only**; no scope expansion  
**Anchors:** `(x-a §2` Anti-Abuse`)` — [`XA_FORTIFICATION_CONTRACT.md`](XA_FORTIFICATION_CONTRACT.md)  
**SSOT parents:** [`10_ACCOUNT.md`](../architecture/10_ACCOUNT.md), [`05_WORKFLOW.md`](../architecture/05_WORKFLOW.md), [`08_CONTENT.md`](../architecture/08_CONTENT.md), [`02_CONSTITUTION.md`](../architecture/02_CONSTITUTION.md), [`12_INFRASTRUCTURE.md`](../architecture/12_INFRASTRUCTURE.md), [`C1A_CONTENT_CONTRACT.md`](C1A_CONTENT_CONTRACT.md), [`B3A_WORKFLOW_AUTOMATION_CONTRACT.md`](B3A_WORKFLOW_AUTOMATION_CONTRACT.md), [`B1A_ACCOUNT_CONTRACT.md`](B1A_ACCOUNT_CONTRACT.md)

---

## 0. Locks & Invariants (non-negotiable)

| Lock | Rule |
|---|---|
| **Publish ladder** | **P0** Official API (`publishMode: api` → history `posted_api`) → **P1** BAE session (`publishMode: session` → history `posted_session`). Matrix selects the path; core must not invent a third live path |
| **Export ≠ sole success** | `content.exportPack` / history `export` is **backup only**. When Matrix `canPublish`, Export alone must never be treated as auto-publish success. Daily Growth DSL **requires** `account.publish` node (B3A / RFC 05) |
| **Gaussian jitter** | Session (and any inter-publish BAE action) delay sampled ~**5–45 seconds** (Gaussian, clamped). No fixed metronome cadence |
| **Daily quota** | Per-account daily publish cap; exceed → **deny/defer with honest code + Matrix/Inbox notice** — never silent drop |
| **Challenge pause** | captcha / challenge / lock → Task terminal **`PAUSED_CHALLENGE`** + System `PublishChallengeDetected` / `PublishAutoPaused` → Inbox. **Zero** solve/bypass CTA or code |
| **Session sandbox** | Per-account browser/session isolation for BAE; **no** cross-account cookie jar / profile sharing |
| **BAE home** | Playwright / Puppeteer / CDP live **only** in `@clime/browser-automation`. Connectors (`plugins/*`, connector packages) **must not** import Playwright |
| **Validate before publish** | Publish rejects content that is not `validated` \| `optimized` \| `ready` (`VALIDATE_REQUIRED`) |
| **Capability honesty** | `canPublish:false` → `BLOCKED_CAPABILITY` (no fake `posted_*`). Matrix badges remain SSOT for UI CTAs |
| **Schema versioning** | Publish result / quota / sandbox envelopes include Zod + `schema_version` |
| **Repository only** | Persist history via Content/Storage ports — no Drizzle in BAE package |

**Forbidden (merge blockers):** Captcha bypass · fingerprint spoof · proxy identity laundering · spam botnet · Playwright inside connectors · Export as sole auto-publish success · Silent drop on quota · Writing `posted_*` on challenge · Validate skip on publish · Prisma/Supabase clients

---

## 1. Package ownership

| Package | Owns | Does **not** own |
|---|---|---|
| **`@clime/browser-automation`** (`packages/browser-automation`) | BAE home; Gaussian jitter; daily quota ledger; session sandbox; API publish adapter port; session publish driver; **PublishLadder** orchestration; `account.publish` Domain handlers | Connector Manifest ownership (`plugin-sdk`); Matrix computation (`account`); Content Produce/Validate/Export (`content`); Planner Queue (`automation`); captcha solve |
| **`@clime/account`** | Capability Matrix; health/challenge state; pause/resume; Account Sandbox diagnostics | Playwright; live publish drivers |
| **`@clime/content`** | History enum parse; `appendHistorySafe` for `posted_*` writers; Export backup | Live publish orchestration |
| **`@clime/workflow`** | DSL requires `account.publish` node (already FROZEN) | BAE / jitter |
| **Connectors / `plugins/*`** | Manifest + thin platform adapters calling BAE ports | Direct `playwright` / `puppeteer` imports |

```text
UI → domain:account.publish
  → PublishLadder
      → Matrix (canPublish / publishMode / riskLevel)
      → Validate gate on ContentItem status
      → Daily quota check
      → if api    → ApiPublishAdapter → history posted_api
      → if session → jitter(5–45s) → SessionSandbox → SessionPublishDriver (BAE)
                     → history posted_session
                     → OR challenge → PAUSED_CHALLENGE + Inbox (no posted_*)
  → Export backup remains parallel (content.exportPack) — never replaces publish
```

---

## 2. Publish ladder semantics

### 2.1 Selection

| Matrix | Ladder action |
|---|---|
| `canPublish: false` | Refuse `{ ok:false, code:"BLOCKED_CAPABILITY", terminal:"BLOCKED_CAPABILITY" }` — no history `posted_*` |
| `canPublish: true` + `publishMode: "api"` | P0 API path |
| `canPublish: true` + `publishMode: "session"` | P1 BAE session path (jitter + sandbox + quota) |
| Health `challenge` / `expired` | Matrix already sets `canPublish:false`; publish must still refuse if raced |

### 2.2 History kinds (writers)

| Kind | Writer |
|---|---|
| `posted_api` | PublishLadder API success only |
| `posted_session` | PublishLadder session success only |
| `export` | Content Export backup only (C1) — **not** a publish success |
| Challenge / quota / capability deny | **No** `posted_*` row |

### 2.3 Domain API

IPC: `domain:account.publish` + envelope `{ requestId, schema_version, traceId }`.

| Method | Kind | Feature key | Behavior |
|---|---|---|---|
| `account.publish` | A | `feature.publish.api` (gate; session path still selected by Matrix `publishMode`) | Long work may return `{ jobId }` **or** sync result in V1 tests; must not block renderer via engine import. Prefer async ack when wired to Workers |

**Input (normative):**

```ts
{
  projectId: string;
  contentItemId: string;
  accountId: string;
  platform?: string;
  /** Test-only: skip wall-clock jitter (production path must apply jitter on session). */
  skipJitter?: boolean;
}
```

**Success:**

```ts
{
  schema_version: 1;
  ok: true;
  publishMode: "api" | "session";
  historyKind: "posted_api" | "posted_session";
  externalPostId: string;
  traceId: string;
  jitterMsApplied?: number; // session path
}
```

**Failure / pause:**

```ts
{
  schema_version: 1;
  ok: false;
  code:
    | "BLOCKED_CAPABILITY"
    | "VALIDATE_REQUIRED"
    | "DAILY_QUOTA_EXCEEDED"
    | "PAUSED_CHALLENGE"
    | "NOT_FOUND"
    | "PUBLISH_FAILED";
  terminal?:
    | "BLOCKED_CAPABILITY"
    | "PAUSED_CHALLENGE"
    | "FAILED";
  message: string;
  traceId: string;
}
```

On `PAUSED_CHALLENGE`: emit System `PublishChallengeDetected` + `PublishAutoPaused` (same contract as Account health challenge). Inbox forwarder already maps these (B2).

---

## 3. Anti-abuse controls (x-a §2)

### 3.1 Gaussian jitter (5–45s)

| Item | Norm |
|---|---|
| Range | Inclusive clamp **[5000, 45000]** ms |
| Distribution | Approximate Gaussian; mean near midpoint (~25s); σ such that most samples fall in-range before clamp |
| Apply when | Session publish path **before** BAE action; also between multi-step BAE actions if any |
| Forbidden | Fixed 0/constant delay in production session path; metronome schedules |

Injectable sampler allowed for unit tests; prove suite must assert production sampler range.

### 3.2 Daily quota

| Item | Norm |
|---|---|
| Key | `(accountId, UTC date YYYY-MM-DD)` |
| Default V1 cap | **20** successful publishes / account / day (configurable inject) |
| On exceed | `{ ok:false, code:"DAILY_QUOTA_EXCEEDED" }` + honest message — **not** silent skip |
| Count | Increment only on **successful** `posted_api` / `posted_session` |

### 3.3 Session sandbox

| Item | Norm |
|---|---|
| Isolation key | `accountId` (+ platform) |
| Guarantee | Distinct sandbox id / profile handle per account; cookie/storage context not shared |
| Owner | `@clime/browser-automation` `SessionSandbox` (BAE). Account package `AccountSandbox` remains **diagnostic** only (B1) |

### 3.4 Challenge / captcha

| Item | Norm |
|---|---|
| Detection | Session driver returns `challenge: true` (or health→challenge) |
| Effect | Terminal `PAUSED_CHALLENGE`; update account health; emit bus events; **no** `posted_*` |
| UI | Inbox + ChallengePauseBanner only — **zero** “solve captcha” / bypass / stealth CTAs in product code |

---

## 4. BAE / Playwright boundary (c2-b)

1. Create `@clime/browser-automation` as the **only** Playwright/CDP home.
2. `BrowserDriver` port + stub driver for CI (no paid cloud / no captcha APIs).
3. Optional real Playwright load **only** inside this package.
4. Boundary tests + ESLint: `playwright` / `puppeteer` imports **forbidden** outside `packages/browser-automation`.
5. `plugin-sdk` / `connector-registry` / `account` / `content` / `workflow` / `automation` deps must not list `playwright`.

---

## 5. Matrix badge integration (c2-c)

| Surface | Rule |
|---|---|
| Mission Center `[자동게시]` | Enabled only when Matrix `canPublish` and no active challenge pause |
| Status board | Shows `canPublish` / `publishMode` / `riskLevel` from `account.getMatrix` (honest) |
| After publish | Refresh Matrix; success notice includes mode (`API` / `SESSION`) |
| After challenge | Matrix `canPublish:false`; Inbox `PAUSED_CHALLENGE`; CTA remains resume/reconnect — never bypass |

---

## 6. Domain events

| Event | Bus | When |
|---|---|---|
| `ContentPublishedApi` | Domain | API path success |
| `ContentPublishedSession` | Domain | Session path success |
| `PublishChallengeDetected` | System | Challenge detected |
| `PublishAutoPaused` | System | Auto-pause after challenge |
| `PublishQuotaExceeded` | System (optional V1) | Daily quota deny |

---

## 7. Import DAG (frozen)

```text
@clime/browser-automation
  → @clime/shared, zod
  → @clime/account (Matrix / health types or injected ports — no Playwright reverse dep)
  → @clime/content (history append / artifact status via injected ports)
  → optional event-bus sink
  → playwright ONLY here (optional/dynamic)

apps/desktop main → wires PublishLadder + account.publish handler
Renderer → DomainClient only (no BAE import)
Connectors → Manifest / BAE ports — NEVER import playwright
```

**Cycle lock:** `@clime/account` **must not** depend on `@clime/browser-automation` (existing B1 boundary). Wiring is composition at desktop host.

---

## 8. Prove checklist (`c2-d`)

- [ ] `@clime/browser-automation` exists; Playwright imports outside it = **0**
- [ ] API path writes `posted_api`; session path writes `posted_session`
- [ ] Export alone never writes `posted_*` (Export ≠ sole success)
- [ ] Challenge → `PAUSED_CHALLENGE` + no `posted_*` + zero bypass CTA strings
- [ ] Gaussian jitter samples clamp to 5–45s; daily quota deny is honest
- [ ] Session sandbox ids differ per `accountId`
- [ ] Daily Growth DSL still requires `account.publish` node
- [ ] Matrix badge fields drive publish refuse/allow
- [ ] `pnpm lint` / `typecheck` / `test` GREEN

---

## 9. Explicit non-goals (out of C2)

- Real multi-browser farm / residential proxy product
- Captcha solving services
- Full connector marketplace plugins beyond Manifest stubs
- Paid Ads spend automation (HumanGate — not C2)
- `.clime` viral playbook (`vg-d`)
- Challenge E2E polish beyond Inbox wiring (Phase F deepens UI E2E)

---

## 10. Handoff

| Next | Model | Scope |
|---|---|---|
| `c2-b` | COMPOSER2.5 | Scaffold `@clime/browser-automation` + Playwright boundary |
| `c2-c` | COMPOSER2.5 | API + session PublishLadder + Matrix CTA wiring |
| `c2-d` | GROK4.5 | Prove GREEN per §8 |

**Changed paths (this part):** `docs/appendix/C2A_PUBLISH_LADDER_CONTRACT.md` only (code 0).
