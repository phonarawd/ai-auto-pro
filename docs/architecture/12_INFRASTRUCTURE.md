# 12 — Infrastructure: Storage, Vault, Buses×4, Notification, Obs

**Status:** Phase 0 RFC  
**Rule:** Infrastructure packages are **not** Domain Engines.

---

## 1. Infra inventory

| Infra | Owns |
|---|---|
| **Storage** | SQLite · File Store · Cache · Blob · Vector(opt) + **Repository Pattern** |
| **Vault** | Secrets / API keys / session material at rest |
| **Session** | Token/session lifecycle |
| **Config** | Versioned *values* — not governance |
| **Feature/Policy/Runtime** | See `13_GOVERNANCE.md` |
| **Notification** | Toast, Inbox, sound, email/webhook |
| **Observability** | Log + Metrics + Trace + Health; audit denials/kills |
| **Eventing** | Command · Query · Domain · System buses |
| **Connector Registry** | Manifest register/discover/health |
| **Plugin SDK** | `plugins/connector\|tool\|workflow\|knowledge\|ai` |
| **Browser Automation** | BAE (large independent package) |

---

## 2. Storage + Repository

- Engines **never** talk Prisma/SQLite directly  
- All persistence behind Repositories in Storage infra  
- Blob/Vector optional  
- Swap SQLite → Postgres/Supabase later without engine rewrites  

File Store roots (illustrative): exports/, blobs/, cache/, logs/

---

## 3. Vault

- OS keychain / encrypted vault directory  
- Config holds **refs** only  
- Never commit secrets (`.gitignore` enforces)  
- Session material encrypted at rest  
- Rotation hooks for OAuth refresh tokens  

---

## 4. Session package

Works with Account Engine:

- logged in · expires · auto-refresh · last used  
- Emits `SessionExpired`  
- No plaintext session files in repo/data without encryption  

---

## 5. Config vs Governance

| Config | Governance |
|---|---|
| Versioned values (paths, defaults, UI prefs) | Feature enablement, Policy limits, Runtime admission |
| Global→Project→User cascade for prefs | Feature→Policy→Runtime checks |

Do not overload Config with Kill Switch or Capability.

---

## 6. Four logical buses (one package)

| Bus | Example | Notes |
|---|---|---|
| **Command** | `EnqueuePlannerItem`, `GenerateContent` | Imperative intents |
| **Query** | `GetMissionToday` | Prefer Domain API read models; bus optional |
| **Domain Event** | `ContentGenerated`, `DecisionMade`, `RoiRecorded` | Growth/content facts |
| **System Event** | `SessionExpired`, `GovernorThrottled`, `KillSwitchActivated`, `HealthDegraded` | Infra/ops |

UI still uses Domain API only; engines publish/subscribe on the appropriate channel.  
Prevents mega-bus chaos.

### Event envelope

```text
{
  schema_version,
  type,
  traceId,
  occurredAt,
  projectId?,
  payload
}
```

---

## 7. Notification

- Toast, Inbox, sound  
- email/webhook later under Policy  
- Policy can require notify on denials, session expiry, review-ready  
- Connector Doctor messages land in Inbox  

---

## 8. Observability

- Log + Metrics + Trace (Trace ID mandatory on Workflow/AI)  
- Health endpoints for connectors/providers  
- Thin audit for Feature denials, Kill Switch, Capability blocks  
- Deep Audit UI = governance extension (not day-one blocker)  

---

## 9. Connector Registry + Plugin SDK

```text
plugins/
  connector/ tool/ workflow/ knowledge/ ai/
```

- Lean Registry row: ID · Version · Dependencies · Lifecycle  
- Manifest sidecar  
- Module Loader honors Plugin Contract First (`02_CONSTITUTION.md`)  
- Remote Plugin Marketplace = L+  

---

## 10. Browser Automation Engine

- Owns Playwright/Puppeteer/CDP/Chrome/Edge/Brave  
- Connectors never import Playwright directly  
- Profile Manager under Tools / Account ops  
- Used for approved assist reads — not silent publish  

---

## 11. Resource Scheduler (Automation)

Global admission: video/image/SEO/keyword/competitor/OCR/AI jobs compete for CPU/RAM/GPU/VRAM/token budgets; priority queues; prevents machine meltdown. Honors Policy + Governor.

---

## 12. Package tree (infra slice)

```text
packages/
  storage/ vault/ session/ config/
  feature-management/
  notification/ observability/
  event-bus/ connector-registry/ plugin-sdk/
  browser-automation/
  shared/
```

---

## 13. Anti-patterns

1. Calling Storage an “Engine” in docs/UI  
2. Engines importing Prisma clients  
3. Single undifferentiated EventBus for all message types  
4. Secrets in Config JSON committed to git  
5. UI subscribing directly to buses  

---

## 14. Cross-references

- Domain API → `04_DOMAIN_API.md`
- Governance detail → `13_GOVERNANCE.md`
- Database entities → `14_DATABASE.md`
- Account/BAE → `10_ACCOUNT.md`
- Constitution Plugin Contract → `02_CONSTITUTION.md`

---

## 15. Acceptance (Phase 0)

- [x] Infra ≠ Engines
- [x] Repository pattern
- [x] Vault/secrets law
- [x] Four buses defined
- [x] Plugin/Registry lean model
