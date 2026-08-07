# S4-A Vault / Session / Config Contract (FROZEN)

**Status:** FROZEN — plan to-do `s4-a` (GROK4.5/256K); **Prove GREEN** (`s4-d` — [`S4D_SECRETS_PROVE.md`](S4D_SECRETS_PROVE.md))  
**Normative for:** `s4-b` / `s4-c` implementation (COMPOSER2.5) — implement **this file only**; no scope expansion  
**SSOT parents:** [`12_INFRASTRUCTURE.md`](../architecture/12_INFRASTRUCTURE.md), [`02_CONSTITUTION.md`](../architecture/02_CONSTITUTION.md), [`10_ACCOUNT.md`](../architecture/10_ACCOUNT.md), [`13_GOVERNANCE.md`](../architecture/13_GOVERNANCE.md), [`07_AI.md`](../architecture/07_AI.md), [`S2A_STORAGE_CONTRACT.md`](S2A_STORAGE_CONTRACT.md), [`XA_FORTIFICATION_CONTRACT.md`](XA_FORTIFICATION_CONTRACT.md) §5

---

## 0. Locks (non-negotiable)

| Lock | Rule |
|---|---|
| Packages | `@clime/vault` · `@clime/session` · `@clime/config` under `packages/{vault,session,config}/` |
| Secrets at rest | **OS keychain and/or encrypted vault only** — never plaintext files in git / committed config / logs |
| Config surface | Config holds **versioned values and vault refs only** — never raw secret plaintext |
| Session at rest | Session material lives in Vault; `SessionRecord` / lifecycle store holds **refs + metadata only** |
| SessionExpired | Lifecycle end **must** emit System bus `SessionExpired` (`schema_version` + `traceId`) |
| Config ≠ Governance | Kill Switch / Feature lifecycle / Policy rules / Capability Matrix **never** stored as Config keys |
| Schema | Boundary payloads Zod + `@clime/shared` `schema_version` |
| Git | `.gitignore` keeps `.env` / `.vault/` / `secrets/` / `*.pem` / `*.key` blocked |
| Prisma / Supabase | Count = **0** (inherited) |
| Renderer | Renderer **must not** import `@clime/vault` (Domain API / main only — CI in slice 5) |

**Forbidden (merge blockers):** plaintext API keys / tokens / session cookies in repo · Config fields holding raw secrets · Config keys that mutate Kill Switch / Feature / Policy · Session material on disk unencrypted · `SessionExpired` omitted on expiry · Logging secret plaintext · Reintroduce Prisma/Supabase.

---

## 1. Ownership & package law

| Package | Owns | Does **not** own |
|---|---|---|
| `@clime/vault` | Secret put/get/delete/rotate; encrypted persistence; opaque `VaultRef` | Account UX · AI adapters · Governance |
| `@clime/session` | Session lifecycle (active/expired/revoked); refresh/touch; emit `SessionExpired` | BAE Playwright · Capability Matrix mutation |
| `@clime/config` | Global→Project→User **value** cascade; prefs/defaults/paths/refs | Feature/Policy/Runtime · Kill Switch · Capability |

### 1.1 Dependency law (frozen)

```text
@clime/vault
  → @clime/shared, zod
  → Node crypto (AES-GCM); optional MasterKeyProvider (OS keychain / file / ephemeral)

@clime/session
  → @clime/shared, @clime/vault, @clime/event-bus, zod
  → SessionRecordPort (injectable; may wrap @clime/storage AccountRepository later)

@clime/config
  → @clime/shared, @clime/storage (SettingsRepository only), zod
  → FORBIDDEN: @clime/feature-management, vault plaintext APIs for “config secrets”
```

AI adapters (slice 4.5) consume **vault refs only**. Account (B1) wires Session + Vault into Domain API.

---

## 2. Vault (`@clime/vault`)

### 2.1 Opaque ref (frozen)

```ts
/** Opaque handle. Pattern: vault:<ulid-or-uuid>. Never equals plaintext. */
export type VaultRef = string; // validated: /^vault:[A-Za-z0-9_-]+$/
```

Storage `AccountCredentialRef.vault_ref` and `SessionRecord.encrypted_blob_ref` store this string only.

### 2.2 Secret kinds

```ts
export type SecretKind =
  | "api_key"
  | "oauth"
  | "session"
  | "refresh_token"
  | "other";
```

### 2.3 Public API (frozen)

```ts
export type VaultPutInput = {
  /** Optional stable id fragment; if omitted, vault generates one. */
  id?: string;
  kind: SecretKind;
  plaintext: string;
  meta?: Record<string, unknown>;
};

export type Vault = {
  putSecret(input: VaultPutInput): Promise<{ ref: VaultRef }>;
  getSecret(ref: VaultRef): Promise<string>;
  hasSecret(ref: VaultRef): Promise<boolean>;
  deleteSecret(ref: VaultRef): Promise<void>;
  /** Replaces material at same ref id (ciphertext rotated). */
  rotateSecret(ref: VaultRef, plaintext: string): Promise<{ ref: VaultRef }>;
};
```

Rules:

1. **`getSecret` plaintext** exists only in caller memory for the duration of the call stack — never written to Config, logs, or git-tracked paths.
2. **At rest:** AES-256-GCM ciphertext under a vault root (e.g. `<userData>/.vault/`) **or** OS keychain-backed entry. V1 may use encrypted-file vault with master key from `MasterKeyProvider`.
3. **Master key providers (V1):**
   - `createEphemeralMasterKeyProvider()` — tests only
   - `createFileMasterKeyProvider(path)` — local; path **must** live under gitignored roots (`.vault/`)
   - `createOsKeychainMasterKeyProvider(service, account)` — preferred when OS keychain available; may wrap native module later. If unavailable at runtime, fall back to encrypted-file provider **inside gitignored user-data**, never repo cwd committed paths.
4. **Index / metadata** on disk may store `{ schema_version, ref, kind, meta, createdAt, updatedAt }` — **never** plaintext.
5. Empty plaintext → reject. Ref parse failure → reject (`VaultRefError`).

### 2.4 Factory (frozen)

```ts
export function createEncryptedFileVault(options: {
  rootDir: string;
  masterKeyProvider: MasterKeyProvider;
}): Vault;

export function createMemoryVault(): Vault; // tests only — no disk
```

`createMemoryVault` **must not** be used as the product default in desktop main.

### 2.5 Logging law

Vault implementations **must not** log `plaintext`, ciphertext hex dumps of secrets, or master keys. Errors may include `ref` id only.

---

## 3. Session (`@clime/session`)

Works with Account Engine (RFC 10 §9). Vault-backed material.

### 3.1 Status enum (aligned with Storage `session_record.status`)

```ts
export type SessionStatus = "active" | "expired" | "revoked";
```

### 3.2 View (no material)

```ts
export type SessionView = {
  schema_version: 1;
  id: string;
  accountId: string;
  status: SessionStatus;
  expiresAt: string | null;
  lastUsedAt: string | null;
  vaultRef: VaultRef;
  createdAt: string;
  updatedAt: string;
};
```

### 3.3 Public API (frozen)

```ts
export type SessionManager = {
  create(input: {
    accountId: string;
    material: string;
    expiresAt?: string | null;
    projectId?: string | null;
    traceId: string;
  }): Promise<{ sessionId: string; vaultRef: VaultRef }>;

  get(sessionId: string): Promise<SessionView | null>;

  /** Resolves material via Vault — caller must not persist plaintext. */
  getMaterial(sessionId: string): Promise<string>;

  touch(sessionId: string, traceId: string): Promise<void>;

  refresh(input: {
    sessionId: string;
    material: string;
    expiresAt?: string | null;
    traceId: string;
  }): Promise<void>;

  /** Marks expired + emits SessionExpired (idempotent if already expired). */
  markExpired(sessionId: string, traceId: string): Promise<void>;

  revoke(sessionId: string, traceId: string): Promise<void>;

  /** Marks all active sessions with expiresAt <= now as expired; emits per session. */
  sweepExpired(input: {
    now?: Date;
    traceId: string;
  }): Promise<{ expiredSessionIds: string[] }>;
};
```

### 3.4 `SessionExpired` (System bus — frozen)

Emit via `@clime/event-bus` `SystemEventBus.publish` using `SYSTEM_EVENT_TYPES.SessionExpired` and `createBusEnvelope`:

```ts
{
  schema_version: 1,
  type: "SessionExpired",
  traceId: string,           // mandatory
  occurredAt: string,        // ISO
  projectId?: string | null,
  payload: {
    sessionId: string,
    accountId: string,
    reason: "expired" | "swept" | "revoked_as_expired",
  }
}
```

| Trigger | `reason` |
|---|---|
| `markExpired` | `"expired"` |
| `sweepExpired` | `"swept"` |
| Optional: revoke that treats as expiry for consumers | `"revoked_as_expired"` — **V1: revoke does not emit SessionExpired**; only expired/swept. (Revoke is intentional; Doctor may listen later.) |

**V1 rule:** `markExpired` and `sweepExpired` **must** publish `SessionExpired`. Inbox surfacing is Notification slice (B2) — emit-only here is enough for Prove.

### 3.5 Persistence port (injectable)

```ts
export type SessionRecordPort = {
  upsert(row: {
    id?: string;
    accountId: string;
    status: SessionStatus;
    expiresAt: string | null;
    lastUsedAt: string | null;
    encryptedBlobRef: string | null;
    metaJson?: string | null;
  }): Promise<{ id: string }>;
  get(id: string): Promise<{
    id: string;
    accountId: string;
    status: SessionStatus;
    expiresAt: string | null;
    lastUsedAt: string | null;
    encryptedBlobRef: string | null;
  } | null>;
  listByAccount?(accountId: string): Promise<Array<{ id: string }>>;
  listActiveExpired?(nowIso: string): Promise<Array<{ id: string }>>;
};
```

`s4-b` ships `createMemorySessionRecordPort()` for tests + `createSessionManager({ vault, systemBus, records })`. Wiring to `@clime/storage` `AccountRepository.upsertSession/getSession` is Account/B1 — not required in s4-b if memory port + listActiveExpired is implemented in-memory.

### 3.6 Factory

```ts
export function createSessionManager(deps: {
  vault: Vault;
  systemBus: SystemEventBus;
  records: SessionRecordPort;
}): SessionManager;
```

---

## 4. Config (`@clime/config`)

### 4.1 Cascade (RFC 13 §3 — frozen)

```text
Global → Project → User
```

**Effective read:** most specific wins — User > Project > Global. Missing key falls outward. Workspace scope = **forbidden** until Team Mode L+.

### 4.2 Value envelope (frozen)

```ts
export type ConfigValueEnvelope =
  | { schema_version: 1; kind: "value"; value: unknown }
  | { schema_version: 1; kind: "ref"; ref: VaultRef };
```

- `kind: "value"` — non-secret prefs/defaults/paths (theme, locale, export root, model **name**, etc.)
- `kind: "ref"` — vault ref string only (e.g. default provider key ref) — **never** inline secret

### 4.3 Forbidden keys (Config ≠ Governance)

Reject set/get mutations for keys matching (case-sensitive prefix / exact):

| Pattern | Why |
|---|---|
| `governance.*` | Governance owns |
| `feature.*` | FeatureState |
| `policy.*` | PolicyRule |
| `killSwitch` / `kill_switch` / `kill-switch` | KillSwitchState |
| `capability.*` | Capability Matrix (Account) |

Also reject envelopes whose `kind: "value"` fails secret heuristics (below).

### 4.4 Secret heuristic (reject plaintext in Config)

On `set` with `kind: "value"`, reject if string value matches **any**:

- length ≥ 20 and charset looks like API token (`sk-`, `xox`, `ghp_`, `AIza`, `Bearer`, etc.)
- key name contains `secret`, `password`, `token`, `apiKey`, `api_key`, `privateKey` (caller should use `kind: "ref"`)

Exact denylist of key suffixes/names is frozen in implementation tests.

### 4.5 Public API (frozen)

```ts
export type CascadeContext = {
  projectId?: string | null;
  userKey?: string | null;
};

export type ConfigStore = {
  set(input: {
    key: string;
    scope: "global" | "project" | "user";
    scopeId?: string; // projectId or userKey when scope requires
    envelope: ConfigValueEnvelope;
  }): Promise<void>;

  get(input: {
    key: string;
    scope: "global" | "project" | "user";
    scopeId?: string;
  }): Promise<ConfigValueEnvelope | null>;

  /** User > Project > Global */
  getEffective(
    key: string,
    ctx: CascadeContext,
  ): Promise<{ envelope: ConfigValueEnvelope; source: "global" | "project" | "user" } | null>;
};
```

### 4.6 Persistence mapping

| Scope | Storage port |
|---|---|
| `global` | `SettingsRepository.putGlobal/getGlobal` — `valueJson` = stringified envelope |
| `project` | `SettingsRepository.putProject/getProject` |
| `user` | `SettingsRepository.putUserPrefs/getUserPrefs` — prefsJson holds `{ schema_version, values: Record<key, ConfigValueEnvelope> }` |

Config package **must** use Repository ports only (no Drizzle).

### 4.7 Factory

```ts
export function createConfigStore(deps: {
  settings: SettingsRepository;
}): ConfigStore;
```

---

## 5. `.gitignore` secret blocking (maintain)

Root `.gitignore` **must** continue to include at least:

```gitignore
.env
.env.*
!.env.example
*.pem
*.key
secrets/
.vault/
```

`s4-c` Prove/tests assert these entries remain. Do not weaken.

---

## 6. Package tree (implementation)

```text
packages/vault/
  package.json
  tsconfig.json
  vitest.config.ts
  src/
    index.ts
    types.ts
    errors.ts
    schemas.ts
    master-key.ts
    memory-vault.ts
    encrypted-file-vault.ts
    create-vault.ts
    vault.test.ts

packages/session/
  package.json
  tsconfig.json
  vitest.config.ts
  src/
    index.ts
    types.ts
    schemas.ts
    errors.ts
    memory-session-record-port.ts
    create-session-manager.ts
    session.test.ts

packages/config/
  package.json
  tsconfig.json
  vitest.config.ts
  src/
    index.ts
    types.ts
    schemas.ts
    errors.ts
    forbidden-keys.ts
    secret-heuristic.ts
    create-config-store.ts
    config.test.ts
    gitignore-secrets.test.ts
```

---

## 7. Explicit non-goals (this slice)

| Non-goal | Owner later |
|---|---|
| Domain API `settings.*` / Account connect wiring | K1 / B1 |
| Inbox UI for `SessionExpired` | B2 Notification |
| AI adapter vault-ref consumption | s4.5 |
| Electron `safeStorage` / keytar native packaging | K2 / desktop shell |
| HumanGate spend UI | H |
| Captcha bypass / fingerprint spoof | **never** |

---

## 8. Acceptance criteria → Prove (`s4-d`)

| # | Check |
|---|---|
| 1 | `@clime/vault` encrypts at rest (file) or memory-only for tests; `VaultRef` opaque; get returns plaintext only in-process |
| 2 | No product API writes secret plaintext to Config or git-tracked paths |
| 3 | `@clime/session` emits `SessionExpired` on `markExpired` / `sweepExpired` |
| 4 | `@clime/config` cascade User > Project > Global; rejects governance keys + secret heuristics |
| 5 | `.gitignore` still blocks `.env`, `.vault/`, `secrets/`, `*.pem`, `*.key` |
| 6 | Grep/audit: no committed `.env` secrets / session tokens as fixtures in packages |
| 7 | Config cannot activate Kill Switch / Feature lifecycle |
| 8 | `pnpm lint` / `typecheck` / `test` GREEN |

---

## 9. Handoff (s4-a complete)

| Field | Value |
|---|---|
| Contract id | `s4-a` |
| Next to-do | `s4-b` (`@clime/vault` + `@clime/session`) |
| Recommended model | **COMPOSER2.5** |
| Then | `s4-c` config → `s4-d` Prove (GROK4.5) |
| Do not | Store secrets in Config · Skip SessionExpired · Import feature-management from config · Scope into AI adapters |
