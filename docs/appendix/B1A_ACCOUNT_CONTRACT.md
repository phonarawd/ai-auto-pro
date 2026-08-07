# B1-A Account, Connector Registry & Plugin SDK Contract (FROZEN)

**Status:** FROZEN — plan to-do `b1-a` (GROK4.5/256K); **Prove** in `b1-d`  
**Normative for:** `b1-b` / `b1-c` implementation (COMPOSER2.5) — implement **this file only**; no scope expansion  
**SSOT parents:** [`10_ACCOUNT.md`](../architecture/10_ACCOUNT.md), [`02_CONSTITUTION.md`](../architecture/02_CONSTITUTION.md), [`04_DOMAIN_API.md`](../architecture/04_DOMAIN_API.md), [`12_INFRASTRUCTURE.md`](../architecture/12_INFRASTRUCTURE.md), [`14_DATABASE.md`](../architecture/14_DATABASE.md), [`S3A_DOMAIN_API_CONTRACT.md`](S3A_DOMAIN_API_CONTRACT.md)

---

## 0. Locks & Invariants (non-negotiable)

| Lock | Rule |
|---|---|
| **Plugin Contract First** | Module/connector discovery & registration via **Manifest only**. Core (`packages/account`, `@clime/domain-api`) **never** imports connector internals or platform SDKs directly. |
| **Auth Ladder** | **P0** Official OAuth/API → **P1** User-approved browser session (`publishMode: session`) → **P2** Manual / Export pack backup. |
| **Capability Matrix** | Honest status board with `canPublish: boolean`, `publishMode: 'api' \| 'session'`, `riskLevel: 'low' \| 'medium' \| 'high'`. Copy: *"이 플랫폼은 여기까지 가능합니다."* |
| **Anti-Abuse / Challenge** | Challenge/captcha/lock detected → emit `PublishChallengeDetected` & `PublishAutoPaused` → **auto-pause pipeline + notify Inbox**. Zero captcha bypass, zero stealth spoofing. |
| **Account Sandbox & Health** | Sandbox executes only declared capability tests per account. Connector Doctor maps error codes to plain-language remediation. |
| **Account Router** | Route targets by channel, default account, or campaign tag (`이벤트` → sub/event accounts, `브랜드` → main official accounts). |
| **Storage & Vault** | Credentials & tokens in `@clime/vault` / OS keychain; metadata & session records in `@clime/storage` (`PlatformAccount`, `AccountCredentialRef`, `SessionRecord`, `PlatformCapability`, `ConnectorRegistration`). |
| **Domain API Wiring** | UI calls `AccountAPI` via `domain:account.<method>`. IPC handlers call `@clime/account` services. |

---

## 1. Package Structure

1. **`@clime/plugin-sdk`** (`packages/plugin-sdk`):
   - Export connector manifest schema & type definitions (`ConnectorManifest`, `ConnectorCapabilities`, `AuthMode`).
   - Export connector interface (`IPlatformConnector`) and lifecycle contracts.
   - Zero dependencies on specific platform implementations or core domain engines.

2. **`@clime/connector-registry`** (`packages/connector-registry`):
   - `ConnectorRegistry`: Register, discover, enable/disable, list registered connectors.
   - Read & validate connector manifests (`schema_version: 1`).
   - Store registration state in storage repository (`ConnectorRegistrationRow`).
   - Provide health check & Capability Matrix calculation primitives.

3. **`@clime/account`** (`packages/account`):
   - `AccountManager`: Manage platform account connections, credential ref mapping, session records.
   - `CapabilityMatrixService`: Compute capability matrix and honest risk levels per account.
   - `AccountRouter`: Multi-account routing per campaign tag / channel.
   - `ConnectorDoctor`: Map error states to human action items for Inbox.
   - `AccountSandbox`: Execute isolated diagnostic tests.
   - `AccountAPI`: Domain API implementation for `account.*` IPC methods.

---

## 2. Connector Manifest Schema (`plugin-sdk`)

```json
{
  "$schema": "https://clime.ai/schemas/connector-manifest.v1.json",
  "schema_version": 1,
  "id": "naver-blog",
  "version": "1.0.0",
  "name": "Naver Blog Connector",
  "platform": "naver",
  "authModes": ["oauth", "session", "manual"],
  "capabilities": {
    "canReadProfile": true,
    "canImportUrl": true,
    "canSchedule": true,
    "canPublish": true,
    "publishMode": "session",
    "riskLevel": "medium",
    "supportedMedia": ["text", "image"]
  },
  "runtimeHints": {
    "requiresBAE": true,
    "rateLimitPerMinute": 10
  }
}
```

---

## 3. Capability Matrix Format

```typescript
export interface PlatformCapabilityMatrix {
  schema_version: 1;
  accountId: string;
  platform: string;
  canPublish: boolean;
  publishMode: 'api' | 'session';
  riskLevel: 'low' | 'medium' | 'high';
  readProfile: boolean;
  importUrl: boolean;
  schedule: boolean;
  reelsOrShorts: boolean;
  stories: boolean;
  notice: string; // e.g. "이 플랫폼은 여기까지 가능합니다."
  updatedAt: string;
}
```

---

## 4. Domain API Specification (`account.*`)

All methods handle IPC under channel `domain:account.<method>` with envelope `{ requestId, schema_version: 1, traceId }`.

| Method | Type | Description |
|---|---|---|
| `account.listAccounts` | Query | List all connected platform accounts for current project |
| `account.connect` | Command | Connect account with platform, authMode & credentials ref |
| `account.disconnect` | Command | Disconnect platform account and revoke/archive credentials |
| `account.getMatrix` | Query | Get honest Capability Matrix for specified account/platform |
| `account.route` | Query | Route campaign action to target platform account IDs |
| `account.health` | Query | Perform or return cached connector health state |
| `account.sandboxTest` | Command | Run account sandbox capability tests |
| `account.importUrl` | Command | Best-effort profile / blog structure import from public URL |
| `account.wizardProgress` | Query/Command | Get/update AI Connection Wizard state |
| `account.pausePublish` | Command | Force pause auto-publishing on specified account |
| `account.resumePublish` | Command | Resume auto-publishing after challenge resolution |

---

## 5. Domain Events (`event-bus`)

- `AccountConnected`: `{ accountId, platform, authMode, traceId }`
- `CapabilityChanged`: `{ accountId, capability: PlatformCapabilityMatrix, traceId }`
- `ConnectorDegraded`: `{ accountId, platform, reason, traceId }`
- `PublishChallengeDetected`: `{ accountId, platform, challengeType, traceId }`
- `PublishAutoPaused`: `{ accountId, platform, reason, traceId }`

---

## 6. Lean package boundary (import DAG — frozen)

```text
@clime/plugin-sdk          →  @clime/shared, zod only
                              (NO platform SDKs, NO account/storage/BAE, NO plugins/*)

@clime/connector-registry  →  @clime/plugin-sdk (+ shared)
                              Manifest validate/register/list/enable only
                              (NO platform connector source imports)

@clime/account             →  @clime/connector-registry, @clime/plugin-sdk (+ shared)
                              Matrix / Router / Doctor / Sandbox / AccountAPI handlers
                              (NO plugins/<connector>/src internals)
                              Vault/session/storage ports may be injected later — not required for B1 skeleton

apps/desktop (main)        →  wires createAccountDomainHandlers into createDomainHost({ handlers })
Renderer                   →  DomainClient only (account.getMatrix …) — never imports @clime/account
```

**Lean rule:** `@clime/plugin-sdk` stays a contract surface (`ConnectorManifest` Zod + `IPlatformConnector`). It must not grow into a god-object registry or account engine.

## 7. `account.getMatrix` semantics (Mission Center status board)

| Input | Honest result |
|---|---|
| `accountId` present | Matrix for that account = Manifest capabilities ∩ health (challenge/expired → `canPublish: false`) |
| `accountId` absent, ≥1 connected | Primary (or first) account Matrix |
| `accountId` absent, 0 connected | `canPublish: false`, `riskLevel: high`, notice includes “연결된 계정 없음”; optional `platforms[]` from enabled Manifests for badge strip |

UI copy remains: **“이 플랫폼은 여기까지 가능합니다.”**

## 8. Anti-Patterns & Verification Criteria

1. **NO direct imports of connector code in core**: Core uses `ConnectorRegistry` + Manifests only (`plugins/*` internals = 0).
2. **NO fake `canPublish` status**: Capability Matrix reflects actual manifest + auth/health state (stub always-true Matrix forbidden on wired host).
3. **NO password-first stealth stacks**: Vault-backed tokens/sessions only.
4. **NO captcha bypass**: Challenge raises `PublishChallengeDetected` → `PublishAutoPaused` → Inbox notice.
5. **NO plugin-sdk → engine cycle**: plugin-sdk must not depend on account / connector-registry / BAE / storage.
