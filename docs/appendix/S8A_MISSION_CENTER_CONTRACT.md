# S8-A Mission Center IA & Copy Specification Contract

**Status:** FROZEN  
**Date:** 2026-08-07  
**Model:** GROK4.5 / 256K  
**SSOT:** [`16_DESIGN_SYSTEM.md`](../architecture/16_DESIGN_SYSTEM.md) §7–8, [`15_DESKTOP_AND_ROADMAP.md`](../architecture/15_DESKTOP_AND_ROADMAP.md) §3, [`04_DOMAIN_API.md`](../architecture/04_DOMAIN_API.md)

---

## 1. Information Architecture (IA) & First Viewport Composition

Home surface composition is strictly locked to **one view** (5 zones):

```text
┌─ Mission Center ─────────────────────────────────────┐
│ Zone A — Brand: CLIME AI Growth Studio               │
│ Zone B — Mission Line: 오늘 미션 한 줄                 │
│ Zone C — CTA Group: [START] [검토] [자동게시] [백업]   │
│ Zone D — Status Board (상태판): Capability + Trace   │
└──────────────────────────────────────────────────────┘
 (Zone E — Decision Explain "Why Today" below/secondary)
```

---

## 2. Zone Specifications & Copy Rules

| Zone | Component / Content | Required Copy / Structure | Forbidden |
|---|---|---|---|
| **A Brand** | Hero-level wordmark | Product name: **`CLIME AI Growth Studio`**<br/>Subtitle: `AI Growth Operating System — Mission Command Center` | Logo mark without name, eyebrow-only brand, purple/cream clichés |
| **B Mission** | Today's Mission | Decision Engine 1-line output (`title` + `description`) | Multi-paragraph strategy essays, marketing hype |
| **C CTA Group** | 4 Priority Actions (L→R) | 1. `[START]` (primary)<br/>2. `[검토]` (secondary)<br/>3. `[자동게시]` (secondary, Matrix-governed)<br/>4. `[내보내기 백업]` (ghost) | Hidden auto-publish CTA, Export as sole success path, direct engine bypass |
| **D Status Board** | Honest Capabilities & Execution | Capability Matrix Badges + Task SM state + Job ID + Trace ID.<br/>Copy: **`“이 플랫폼은 여기까지 가능합니다.”`** | Vanity KPI cards (followers/impressions/growth %), promo stickers, metric collages |
| **E Decision Explain** | Decision Graph "Why Today" | Compact Decision summary from `growth.getMissionToday` | Competing CTA clusters, fake marketing banners |

---

## 3. Fixed Capability Fields & Enum Contracts

```typescript
export type CapabilityMatrixData = {
  canPublish: boolean;
  publishMode: "api" | "session";
  riskLevel: "low" | "medium" | "high";
  platforms: Array<{
    id: string;
    name: string;
    canPublish: boolean;
    publishMode: "api" | "session";
  }>;
};
```

- **`canPublish`**: Boolean. Truth from Platform Capability Matrix. If `false`, `[자동게시]` CTA is disabled and reason shown.
- **`publishMode`**: Enum `"api" | "session"`. Displayed on badge.
- **`riskLevel`**: Enum `"low" | "medium" | "high"`. Displayed on badge with corresponding tone (`success` | `warning` | `danger`).
- **`Copy Rule`**: Must explicitly state `"이 플랫폼은 여기까지 가능합니다."` on Status Board header/caption.

---

## 4. Priority CTA Behavior & Runtime Contract

1. **`[START]`**:
   - Triggers `window.domainClient.automation.startMission({ missionId })`.
   - Returns `jobId` immediately (non-blocking).
   - Updates Task SM status to `RUNNING` or `QUEUED`.
   - Updates Trace ID.
2. **`[검토]`**:
   - Toggles content review mode (`reviewMode`).
   - Displays validated content items for manual check before publishing.
3. **`[자동게시]`**:
   - Executes auto-publish workflow if `canPublish === true`.
   - Blocked with honest notice if `canPublish === false`.
4. **`[내보내기 백업]`**:
   - Generates backup log JSON.
   - Always labeled as **`내보내기 백업`** / **Backup Log** (never sole success path).

---

## 5. Architectural Isolation Locks

1. Renderer (`apps/desktop/src/renderer`) consumes `@clime/ui` ONLY.
2. Renderer invokes IPC via `window.domainClient` bridge ONLY.
3. Imports of `@clime/storage`, `@clime/event-bus`, `@clime/vault`, or engine packages in renderer are strictly **prohibited** (enforced by ESLint boundary test).
4. No Cards used as layout default in hero; `Panel` + `DataRow` + `Badge` for status board.

---

## 6. Verification & Gate Criteria

- `pnpm lint`, `pnpm typecheck`, `pnpm test` must be **GREEN**.
- `MissionCenterFrame` must render all 5 zones with exact copy & token variables.
- Acceptance Gate checklist in [`16_DESIGN_SYSTEM.md`](../architecture/16_DESIGN_SYSTEM.md) §9 must be 100% verified.
