# S6-C UI Kit Prove (GREEN)

**Status:** GREEN — plan to-do `s6-c` (GROK4.5/256K)  
**Date:** 2026-08-07  
**SSOT:** [`16_DESIGN_SYSTEM.md`](../architecture/16_DESIGN_SYSTEM.md)  
**Package:** `@clime/ui` (`packages/ui`)

---

## Prove checklist

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | `--clime-*` tokens = 16 SSOT only (color/type/space/radius/motion) | PASS | `tokens.test.ts` + `prove.s6c.test.ts` token drift = 0 |
| 2 | Arbitrary hex outside token definition layer = **0** | PASS | `prove.s6c.test.ts` greps `.ts/.tsx/.css` excluding `tokens.ts` / `tokens.css` |
| 3 | Cliché look = **0** (purple/cream/terracotta anchors absent from values) | PASS | Accent `#0F766E` teal-ink; bg ≠ `#F4F1EA`; `FORBIDDEN_CLICHE_HEX` absent |
| 4 | Whitelist primitives only (+ Card interaction-only) | PASS | Button, IconButton, Badge, Toolbar, Panel, DataRow, Toast, CommandPalette, Card |
| 5 | Card abuse = **0** (`interactive: true` + `interactionLabel`; no StatCard/MetricStrip) | PASS | `Card.tsx` + smoke + prove |
| 6 | Pretendard locked on `--clime-font-sans` | PASS | tokens SSOT + prove |
| 7 | `pnpm lint` / `typecheck` / `test` GREEN for `@clime/ui` | PASS | 17 Vitest tests |

---

## Implementation map

| Area | Path |
|---|---|
| Token names (16) | `packages/ui/src/tokens/token-names.ts` |
| Token values + CSS | `packages/ui/src/tokens/tokens.ts`, `tokens.css` |
| Primitives | `packages/ui/src/primitives/*` |
| Public export | `packages/ui/src/index.ts` (+ `./tokens.css`) |
| Smoke | `packages/ui/src/primitives/smoke.test.tsx` |
| Prove | `packages/ui/src/prove.s6c.test.ts` |

---

## Locks reaffirmed

- Screens consume `var(--clime-*)` only — hex only in token layer
- Cool neutral ops + **one** teal-ink accent — no purple SaaS / cream+serif / glow chrome
- Card ≠ layout default; Panel + DataRow for ops surfaces
- Toast requires Inbox handoff (no silent challenge dismiss)
- New primitives require RFC **16** update first

---

## Handoff

| Field | Value |
|---|---|
| Prove id | `s6-c` |
| Slice 6 | **DONE** (`s6-a` → `s6-b` → `s6-c`) |
| Next to-do | `s7-a` (Desktop shell — Electron main+preload+Next frame) |
| Recommended model | **COMPOSER2.5** |
| Do not | Invent StatCard/MetricStrip · Raw hex in screens · Card in Mission Center hero |
