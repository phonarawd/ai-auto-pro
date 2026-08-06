# 10 — Account: Manager, Connectors, Capability Matrix

**Status:** Phase 0 RFC  
**Package:** `packages/account/` (+ connectors via Registry)  
**Law:** “로그인/세션이 기술적으로 가능하다” ≠ “자동 게시·대량 작업이 정책상 허용된다.”

---

## 1. Why Account is P0

Without accounts, generation is generic. With accounts, AI optimizes per **connected profile** (tone, categories, blog URL, which IG account gets event vs brand posts).

---

## 2. Stack

```text
Account Engine           (accounts, login UX, Capability, Router, Sandbox UI)
        ↓
Session Manager          (packages/session — token/session lifecycle)
Tool Engine
  ├ Browser Automation Engine (packages/browser-automation)
  ├ Browser Profile Manager
  ├ Filesystem · OCR · PDF · Screenshot · Clipboard · Local Search · MCP
        ↓
Connector Registry + Manifest
        ↓
Platform Connectors      (thin; call Session + Tool ports; emit events)
```

**Do not scatter Playwright/Puppeteer/CDP in connectors.** All browser tech through BAE.

---

## 3. Account Manager UI

```text
계정관리
├─ 네이버 블로그     [로그인]  ● 연결됨
├─ Instagram         [로그인]
├─ Facebook          [로그인]
├─ TikTok            [로그인]
├─ YouTube           [로그인]
├─ Threads           [로그인]
└─ X                 [로그인]
```

After connect (Naver example): Nickname, Blog URL, Categories count, Recent posts count, Status.

Project open → connection strip without re-login when tokens/sessions valid.

---

## 4. Multi-account + Account Router

```text
Naver: CLIME, 서브1, 서브2
IG: clime_official, clime_event, clime_ads
TikTok: clime_short
```

On generate/transform, Router picks targets via:

- Manual default per channel  
- Campaign-tag routing  
- Memory hints  

**Normative:** Campaign `이벤트` → IG `clime_event` + Threads/TikTok event; `브랜드` → IG/Facebook Official.

---

## 5. Auth ladder (per connector)

| Priority | Mode | Use | Examples |
|---|---|---|---|
| **P0** | Official OAuth / API | Stable connect + publish when API allows | FB, IG Business, YouTube, TikTok Business (partial), WordPress, Shopify |
| **P1** | User-approved browser session assist | API missing/limited; user starts flow; encrypted session | Some KR blogs / limited surfaces |
| **P2** | Manual / Export-only | Always available | Paste URL + profile; dated Export packs |

**Forbidden in core:** password-first default UX, stealth anti-detect posting, session ⇒ bulk publish.

---

## 6. Capability Matrix (must keep — show in UI)

Per platform/account honest flags, e.g. Instagram:

| 읽기 | 프로필 | 예약 | 게시 | 스토리 | 릴스 |
|---|---|---|---|---|---|
| ○ | ○ | × | ○* | × | ○* |

\* only if official API connector says so.  
UI copy: **“이 플랫폼은 여기까지 가능합니다.”**

| Capability | Default |
|---|---|
| Multi-account + Router + account-aware generation | Yes |
| Profile / blog URL import (best-effort) | Yes |
| `publish_ready` + dated Export | Yes (V1 path) |
| Live publish | Only `canPublish=true` via official API connector |
| Browser-session / profile assist | Optional; never implies `canPublish` |

Keep Account Manager / Connector / Matrix **independent** forever.

---

## 7. Connector Manifest

Each connector ships JSON Manifest, e.g. Naver:

```text
id, version,
auth: [oauth|session|manual],
capabilities: { api, browser, publish, schedule, readProfile, importUrl, … }
```

Registry: register / discover / enable / health. Feature Mgmt supplies enabled flag.

Core never imports platform SDKs; connectors are thin plugins.

---

## 8. URL auto-recognition

Paste blog/profile URL → import whatever public structure + policy allows → bind to project.  
UI shows “가져온 항목 / 불가 항목”.  

Fetch order: official API → user-approved browser session read → manual edit.

---

## 9. Session Manager

Per-account: logged in · expires · auto-refresh · last used. Vault-backed.  
Emits `SessionExpired` on System/Domain bus → Doctor/Inbox.

---

## 10. Browser Automation Engine (BAE)

Independent package (expect large LOC). Owns Playwright/Puppeteer/CDP/Chrome/Edge/Brave.  
API connectors may skip BAE entirely.

### Browser Profile Manager

- Enumerate/register Chrome · Edge · Brave profiles  
- Bind platform account → profile (IG → Chrome P2, Naver → P1)  
- User-approved session assist only — not OAuth substitute when OAuth exists  
- Revoke/unlink without deleting browser data  

---

## 11. Account ops layer

### Connector Health

Connected ✓ · Last Sync · API/Session Healthy | Degraded | Expired.

### AI Connector Doctor

Maps errors → plain-language next step (Inbox/Command Center).  
Aggressive Memory writes only with user confirm.

### Account Sandbox

Per account diagnostics: 읽기 / 로그인 / 릴스 업로드 / 이미지 업로드 / 권한 — only declared capability tests.

### Account Dashboard

Followers · Posts · Views · Clicks · Conversion (manual + imported).

### AI Connection Wizard

First launch → platform select → connect → profile import → brand draft → first content tips → Mission Center. Skippable; resumable.

---

## 12. Domain API

`AccountAPI.connect|disconnect|getMatrix|route|health|sandboxTest|importUrl|listAccounts|wizardProgress`

---

## 13. Events

| Event | Bus |
|---|---|
| `AccountConnected` | Domain |
| `SessionExpired` | System |
| `CapabilityChanged` | Domain |
| `ConnectorDegraded` | System |

---

## 14. Anti-patterns

1. Universal auto-login + auto-post  
2. Playwright import inside Naver connector file  
3. UI assuming `canPublish` because session exists  
4. Core depending on stealth stacks  
5. Platform logic in Growth/Content  

---

## 15. Cross-references

- Constitution Capability → `02_CONSTITUTION.md`
- Export path → `08_CONTENT.md`
- BAE / Vault → `12_INFRASTRUCTURE.md`
- Wizard / Mission Center UX → `15_DESKTOP_AND_ROADMAP.md`

---

## 16. Acceptance (Phase 0)

- [x] Auth ladder P0→P2
- [x] Capability Matrix UI law
- [x] session≠publish
- [x] Connector Manifest + Registry
- [x] BAE isolation
