# S4.5-A AI Adapter + Cost Contract (FROZEN)

**Status:** FROZEN — plan to-do `s4.5-a` (GROK4.5/256K); **Prove GREEN** (`s4.5-c` — [`S45C_AI_PROVE.md`](S45C_AI_PROVE.md))  
**Normative for:** `s4.5-b` implementation (COMPOSER2.5) — implement **this file only**; no scope expansion  
**Prove:** `s4.5-c` → [`S45C_AI_PROVE.md`](S45C_AI_PROVE.md)  
**SSOT parents:** [`07_AI.md`](../architecture/07_AI.md), [`02_CONSTITUTION.md`](../architecture/02_CONSTITUTION.md), [`03_ENGINES.md`](../architecture/03_ENGINES.md), [`S4A_VAULT_SESSION_CONFIG_CONTRACT.md`](S4A_VAULT_SESSION_CONFIG_CONTRACT.md), [`XA_FORTIFICATION_CONTRACT.md`](XA_FORTIFICATION_CONTRACT.md) §6

---

## 0. Locks (non-negotiable)

| Lock | Rule |
|---|---|
| Package | `@clime/ai` under `packages/ai/` only |
| Vendor SDK | OpenAI / Gemini / Claude / DeepSeek / etc. SDKs **only** inside Adapter modules under `packages/ai` — never in Growth / Content / Decision / Meta / UI |
| Cost Intelligence | Lives in `packages/ai` — **never** `packages/meta` |
| Secrets | Adapter credentials = **vault refs only** (`VaultRef`); Config stores refs/values; plaintext only via `Vault.getSecret` in-process |
| Fault tolerance | Per-adapter **circuit breaker** + task-class **fallback chain** (cloud → alternate → **Ollama**) + **exponential backoff** (x-a §6) |
| Engine façade | Domain calls `AIEngine.complete(...)` / `embed(...)` / `health(...)` — never vendor clients |
| Schema | Boundary payloads Zod + `@clime/shared` `schema_version` |
| Prisma / Supabase | Count = **0** (inherited) |
| Renderer | Renderer **must not** import `@clime/ai` (Domain API / main / workers only — CI in slice 5) |

**Forbidden (merge blockers):** `import … from 'openai'` (or any vendor SDK) in domain packages · Cost routing in Meta · plaintext API keys in Config/git/logs · calling vendor clients from Content/Growth · skipping Validate because of model choice · silent spend past budget (when budgets wired) · UI-thread blocking AI awaits (callers return `jobId` at Domain API — Automation owns scheduling).

---

## 1. Ownership & package law

| Module (inside `@clime/ai`) | Owns | Does **not** own |
|---|---|---|
| **AIAdapter** | Vendor protocol isolation; `complete` / `embed` / `health` | Domain prompts as business logic · Governance admit |
| **Provider Registry** | Register/list adapters by id + capabilities | Account UX |
| **Router + Fallback** | Task-class → ordered adapter chain; honor open breakers | Planner Queue |
| **Circuit Breaker** | Per-adapter open/half-open/closed | Platform publish jitter (c2) |
| **Retry / Backoff** | Exponential backoff (+ optional jitter); max retries | Worker lease heartbeat |
| **Cost Intelligence** | Propose cheapest/sufficient adapter+model; budget check stub; usage record stub | Executive envelopes · daily Decision |
| **Prompt Templates** | Provider-agnostic template ids + versions (port / stub OK in V1 skeleton) | Content Validate rules |
| **AIEngine** | Single façade wiring registry + cost + breaker + fallback + vault | Domain API IPC host |

### 1.1 Dependency law (frozen)

```text
@clime/ai
  → @clime/shared, @clime/vault, zod
  → Node fetch / vendor SDK **only** under src/adapters/**
  → FORBIDDEN: @clime/storage Drizzle drivers, @clime/feature-management (Governor admits AI jobs later via Automation)
  → FORBIDDEN: packages/meta, growth/*, content (ai does not import domain engines)
```

Vault usage: adapters receive resolved plaintext **only** through engine-injected credential resolver that calls `Vault.getSecret(ref)`. Adapter config stores `apiKeyRef: VaultRef | null` — never raw keys.

### 1.2 Cost vs Meta (frozen)

```text
Cost Intelligence  →  packages/ai/
Executive / Goal   →  packages/meta/   (does not exist yet; must never host Cost)
```

Any future `packages/meta` **must not** export Cost routing / spend selection APIs.

---

## 2. Types & Zod boundaries

### 2.1 Task / quality / latency classes

```ts
export type TaskClass =
  | "research_summarize"
  | "content_longform"
  | "content_short"
  | "validate_json"
  | "embed_default"
  | "generic_chat";

export type QualityTier = "draft" | "final" | "critical";
export type LatencyClass = "interactive" | "batch";
export type BudgetClass = "free_local" | "cheap_cloud" | "standard" | "premium";
```

### 2.2 Messages & complete request/response

```ts
export type AiRole = "system" | "user" | "assistant";

export type AiMessage = {
  role: AiRole;
  content: string;
};

export type AiCompleteRequest = {
  schema_version: 1;
  traceId: string;
  taskClass: TaskClass;
  messages: AiMessage[];
  /** Optional JSON-mode / structured hint — adapters map if capable */
  responseFormat?: "text" | "json";
  qualityTier?: QualityTier;
  latencyClass?: LatencyClass;
  budgetClass?: BudgetClass;
  maxTokens?: number;
  /** Abort / cancel signal from worker */
  signal?: AbortSignal;
};

export type AiCompleteResult = {
  schema_version: 1;
  traceId: string;
  text: string;
  adapterId: string;
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    costUnits?: number;
  };
  /** True when a later chain member served after prior failure/open breaker */
  usedFallback: boolean;
};
```

Zod: `aiCompleteRequestSchema` / `aiCompleteResultSchema` with required `schema_version`.

### 2.3 Adapter contract (frozen)

```ts
export type AiAdapterCapabilities = {
  chat: boolean;
  vision: boolean;
  embed: boolean;
  json_mode: boolean;
  tools: boolean;
};

export type AiAdapterCompleteInput = {
  messages: AiMessage[];
  model: string;
  maxTokens?: number;
  responseFormat?: "text" | "json";
  /** Resolved plaintext API key (ephemeral). Null for local/no-auth adapters. */
  apiKey: string | null;
  signal?: AbortSignal;
};

export type AiAdapter = {
  readonly id: string;
  readonly vendor: string;
  readonly capabilities: AiAdapterCapabilities;
  /** Default model id for this adapter when Cost does not override */
  readonly defaultModel: string;
  complete(input: AiAdapterCompleteInput): Promise<{
    text: string;
    model: string;
    usage?: { inputTokens?: number; outputTokens?: number };
  }>;
  embed?(input: {
    texts: string[];
    model: string;
    apiKey: string | null;
    signal?: AbortSignal;
  }): Promise<{ vectors: number[][] }>;
  health(): Promise<"ok" | "degraded" | "down">;
};
```

Rules:

1. Domain / Growth / Content **never** hold `AiAdapter` vendor internals — only `AIEngine`.
2. V1 skeleton **may** ship Fake/Stub cloud adapters + Ollama HTTP adapter **without** adding npm vendor SDKs yet. Real SDK adapters (e.g. `openai`) must live under `src/adapters/` and keep the same interface.
3. Swapping cloud ↔ Ollama = registry + fallback chain config change — **zero** domain rewrites.

### 2.4 Vault-backed adapter registration

```ts
export type AiAdapterRegistration = {
  adapter: AiAdapter;
  /** Vault ref for API key; null = no secret (typical Ollama local) */
  apiKeyRef: VaultRef | null;
  /** Cost units per 1k tokens estimate (stub pricing table) */
  costUnitsPer1kTokens: number;
  /** Prefer for these budget classes */
  budgetClasses: BudgetClass[];
};
```

---

## 3. Circuit breaker (x-a §6)

Per **adapter id** (not global):

| State | Behavior |
|---|---|
| `closed` | Calls allowed; failures increment counter |
| `open` | Short-circuit immediately (`CIRCUIT_OPEN`); no vendor call |
| `half_open` | Allow probe call(s); success → `closed`; failure → `open` |

### 3.1 Defaults (V1 frozen knobs)

| Knob | Default |
|---|---|
| `failureThreshold` | `3` consecutive failures (or within window) |
| `openMs` | `5_000` (test-friendly; product may raise via options) |
| `halfOpenSuccesses` | `1` |

Timeouts / 5xx / thrown adapter errors count as failure. Successful `complete` resets failure streak and closes from half-open.

Open breaker **does not** fail the whole request if a later fallback chain member is available — engine skips to next.

---

## 4. Exponential backoff (x-a §6)

On retryable adapter failure (before leaving that adapter / between attempts):

```text
delayMs = min(maxDelayMs, baseDelayMs * 2^attempt) + optional_jitter
```

| Knob | Default |
|---|---|
| `maxRetriesPerAdapter` | `2` (total attempts = 1 + retries) |
| `baseDelayMs` | `50` (tests); production options may raise |
| `maxDelayMs` | `2_000` |
| `jitter` | `full` (0…delay) optional boolean — V1: enabled |

Non-retryable: `AbortError`, auth failures (`AI_AUTH`), validation errors — do not backoff-loop; advance fallback or fail.

---

## 5. Fallback chain (x-a §6)

```ts
/** Ordered adapter ids; first healthy+closed preferred */
export type FallbackChain = readonly string[];

export type AiEnginePolicy = {
  /** Per taskClass chain; missing → `defaultChain` */
  chains: Partial<Record<TaskClass, FallbackChain>>;
  defaultChain: FallbackChain;
};
```

Normative V1 example (tests must cover shape):

```text
content_longform:  ["cloud-primary", "cloud-secondary", "ollama"]
generic_chat:      ["cloud-primary", "ollama"]
validate_json:     ["cloud-primary", "ollama"]
embed_default:     ["cloud-primary"]   // Ollama embed optional later
```

Domain code **unaware** of vendor names — only `taskClass` + result `adapterId` for observability.

On chain exhaustion → `AiAllProvidersFailedError` with `traceId` (honest failure; no UI hang — callers already async/`jobId`).

---

## 6. Cost Intelligence (in `@clime/ai` only)

### 6.1 V1 stub surface (frozen — enough for Prove)

```ts
export type CostProposal = {
  schema_version: 1;
  adapterId: string;
  model: string;
  estimatedCostUnits: number;
  budgetClass: BudgetClass;
};

export type CostIntelligence = {
  /** Pick preferred adapter+model for request among registered candidates */
  propose(input: {
    taskClass: TaskClass;
    budgetClass: BudgetClass;
    qualityTier: QualityTier;
    candidateAdapterIds: string[];
  }): CostProposal;

  /** Soft budget check — stub may always allow unless exhausted flag set in tests */
  checkBudget(input: {
    projectId?: string;
    estimatedCostUnits: number;
  }): { ok: true } | { ok: false; code: "AI_BUDGET_EXHAUSTED" };

  recordUsage(input: {
    adapterId: string;
    costUnits: number;
    traceId: string;
  }): void;
};
```

Rules:

1. Prefer lower `costUnitsPer1kTokens` among candidates that support the task (chat vs embed) and budget class.
2. `budgetClass: "free_local"` → prefer Ollama / zero-key adapters when present in candidates.
3. Hard-stop when `checkBudget` fails → `AiBudgetExhaustedError` (maps later to Policy/Governor `POLICY_DENIED`).
4. **Meta must not** implement or re-export this.

Full price tables / Project budgets from Config+Policy = later slices; stub pricing constants OK.

---

## 7. AIEngine façade (frozen)

```ts
export type AIEngine = {
  complete(req: AiCompleteRequest): Promise<AiCompleteResult>;
  health(): Promise<Record<string, "ok" | "degraded" | "down" | "circuit_open">>;
};

export function createAIEngine(options: {
  vault: Vault;
  registrations: AiAdapterRegistration[];
  policy: AiEnginePolicy;
  cost?: CostIntelligence;
  breaker?: CircuitBreakerOptions;
  backoff?: BackoffOptions;
  /** Injectable clock/sleep for tests */
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}): AIEngine;
```

### 7.1 `complete` algorithm (normative)

```text
1. Parse/validate req (Zod + schema_version); require non-empty traceId
2. Resolve chain = policy.chains[taskClass] ?? policy.defaultChain
3. Filter chain to registered adapter ids
4. cost.propose(...) among chain candidates (respect budgetClass / free_local)
5. Ordered attempt list = [proposed.adapterId, ...rest of chain without dupes]
6. For each adapterId in attempt list:
   a. If breaker open → skip (try next)
   b. Resolve apiKey = apiKeyRef ? vault.getSecret(ref) : null
   c. Attempts with exponential backoff up to maxRetriesPerAdapter
   d. On success → breaker success; cost.recordUsage; return result (usedFallback flag)
   e. On failure → breaker failure; continue retries / next adapter
7. Throw AiAllProvidersFailedError({ traceId })
```

Partial failure: never leave domain with ambiguous success; either result or typed error with `traceId`.

---

## 8. Errors (frozen codes)

| Error class | code | When |
|---|---|---|
| `AiError` | `AI_ERROR` | Base |
| `AiValidationError` | `AI_VALIDATION` | Bad request / schema |
| `AiAuthError` | `AI_AUTH` | Vault miss / auth reject |
| `AiCircuitOpenError` | `CIRCUIT_OPEN` | Internal skip signal (may be swallowed by engine when falling back) |
| `AiBudgetExhaustedError` | `AI_BUDGET_EXHAUSTED` | Cost hard-stop |
| `AiAllProvidersFailedError` | `AI_ALL_FAILED` | Chain exhausted |

All thrown errors that escape `complete` **must** carry `traceId` when available.

---

## 9. Events (emit optional in V1 skeleton)

| Event | Bus (when wired) | Payload must include |
|---|---|---|
| `AiProviderDegraded` | System | `adapterId`, `traceId`, `schema_version` |
| `AiBudgetExhausted` | System | `traceId`, `schema_version` |
| `AiFallbackUsed` | Domain/System | `fromAdapterId`, `toAdapterId`, `traceId`, `schema_version` |

V1 skeleton: engine may omit bus publish; tests assert fallback via `usedFallback` + result `adapterId`. Bus wiring = slice 3 buses already exist; optional inject later — **not** required for `s4.5-c` GREEN.

---

## 10. V1 skeleton adapters (s4.5-b must ship)

| Adapter id | Vendor label | apiKeyRef | Role |
|---|---|---|---|
| `cloud-primary` | `fake-cloud` | required VaultRef in prod-shaped tests | Primary cloud stub |
| `cloud-secondary` | `fake-cloud` | required VaultRef | Alternate cloud stub |
| `ollama` | `ollama` | `null` | Local fallback; HTTP-shaped stub OK (no real daemon required in unit tests) |

Factory helpers:

- `createFakeCloudAdapter({ id, vendor?, completeImpl?, healthImpl? })`
- `createOllamaAdapter({ id?, baseUrl?, completeImpl? })` — default id `ollama`

Unit tests inject `completeImpl` to simulate outage / timeout / success without network.

---

## 11. File layout (s4.5-b target)

```text
packages/ai/
  package.json
  tsconfig.json
  vitest.config.ts
  src/
    index.ts
    types.ts
    schemas.ts
    errors.ts
    backoff.ts
    circuit-breaker.ts
    cost/cost-intelligence.ts
    adapters/fake-cloud-adapter.ts
    adapters/ollama-adapter.ts
    create-ai-engine.ts
    ai.test.ts
    prove.s45c.test.ts
```

---

## 12. Explicit non-goals (this slice)

| Non-goal | Owner later |
|---|---|
| Real OpenAI/Anthropic/Gemini npm SDK wiring | Post-4.5 when keys + product path need live calls |
| Prompt Evaluation A/B UI | Later AI polish |
| Stream tokens to renderer | Domain API stream path later |
| Resource Scheduler / Governor admission of AI jobs | Automation `b3` + feature-management |
| Settings UI for model prefs | K1 |
| Domain API `tool.*` AI playground | Optional Tools panel |
| packages/meta Executive | Phase J — must not take Cost |

---

## 13. Acceptance criteria → Prove (`s4.5-c`)

| # | Check |
|---|---|
| 1 | `@clime/ai` exports `createAIEngine`, `AIAdapter`, Cost Intelligence — Cost **not** under meta |
| 2 | Grep: domain package trees (`growth`, `content`, `meta` if any) have **zero** vendor SDK imports (`openai`, `@anthropic-ai/*`, `@google/generative-ai`, etc.) |
| 3 | Adapter credentials consumed via `VaultRef` + `Vault.getSecret` only (tests prove plaintext not stored on registration) |
| 4 | Circuit breaker opens after failure threshold; open adapter skipped; fallback still serves |
| 5 | Fallback chain reaches `ollama` when clouds fail / breakers open |
| 6 | Exponential backoff invoked between retries (injectable sleep asserts delays) |
| 7 | Cost stub prefers cheaper / `free_local` → Ollama when appropriate; budget exhaust path exists |
| 8 | Swapping adapters = registration/policy only — same `AIEngine.complete` call site |
| 9 | `pnpm lint` / `typecheck` / `test` GREEN |

---

## 14. Handoff (s4.5-a complete)

| Field | Value |
|---|---|
| Contract id | `s4.5-a` |
| Next to-do | `s4.5-b` (`packages/ai` skeleton) |
| Recommended model | **COMPOSER2.5** |
| Then | `s4.5-c` Prove (GROK4.5) |
| Do not | Put Cost in Meta · Import vendor SDK in domain · Store API keys in Config · Skip breaker/fallback/backoff · Expand into live OpenAI product wiring |
