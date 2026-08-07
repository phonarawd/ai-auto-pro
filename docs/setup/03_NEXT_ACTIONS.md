# Next actions — V1 COMPLETE

**Status:** [`05_IMPL_APPROVAL.md`](05_IMPL_APPROVAL.md) is **APPROVED** (2026-08-07).  
**V1 Acceptance:** **DONE / GREEN** (2026-08-07) — [`V1D_FINAL_SIGNOFF.md`](../appendix/V1D_FINAL_SIGNOFF.md).

**Execution SSOT:** Cursor plan `world-class_ux_os_plan` (slice order below). Architecture detail remains in `docs/architecture/*`.

Fortification (`x-a`, `s2-e`, `x-b`) and Zero-Cost Viral Growth (`vg-a`→`e`) are **plan to-do SSOT** — not narrative-only.

## Done

1. Toolchain installed and verified — `scripts/check-toolchain.ps1` → **GREEN**.
2. Git identity set **local to this repo** (`phonarawd` / GitHub noreply).
3. Phase 0 — architecture RFCs under `docs/architecture/` (includes 5 constitutional locks + full-auto publish ladder).
4. Remote `origin` → `https://github.com/phonarawd/ai-.git`.
5. Beginner operate guide — `docs/setup/04_HOW_TO_OPERATE.md`.
6. Locked decisions absorbed: API→session auto-publish, Export backup, Drizzle/Zod/Vitest/Playwright/Turborepo/electron-builder.
7. Quality gates — `scripts/check-phase0.ps1` + markdownlint-cli2 → **GREEN**.
8. Implementation approval — human phrase `Phase A 승인` recorded in `05_IMPL_APPROVAL.md`.
9. **슬라이스 1** — Monorepo infra (pnpm workspaces + Turborepo + `@clime/shared` + `@clime/desktop` stub).
10. **슬라이스 1.5** — Design Gate `docs/architecture/16_DESIGN_SYSTEM.md` + `check-phase0` RFC 16 → **GREEN**.
11. **슬라이스 1.6** — RFC/setup sync: `15` Mission=슬라이스8 stub+실엔진 B + 상태판; `06` Topic→`growth/planning`; `05` DSL `publish`+Export backup; this file + README order sync → **GREEN**.
12. **슬라이스 2 / `s2-a`→`s2-d`** — Storage **PROVED GREEN**: [`S2A_STORAGE_CONTRACT.md`](../appendix/S2A_STORAGE_CONTRACT.md) + [`S2D_STORAGE_PROVE.md`](../appendix/S2D_STORAGE_PROVE.md) (`@clime/storage` 25 tables · Repo-only · Zod/`schema_version` · Prisma0 · Supabase0; lint/typecheck/test GREEN).
13. **슬라이스 2.5 / `s2.5-a`→`s2.5-c`** — Feature→Policy→Runtime **PROVED GREEN**: [`S25A_GOVERNANCE_CONTRACT.md`](../appendix/S25A_GOVERNANCE_CONTRACT.md) + [`S25C_GOVERNANCE_PROVE.md`](../appendix/S25C_GOVERNANCE_PROVE.md) (`@clime/feature-management` · `admit()` gate · Kill Switch→`CANCELLED` · GovernanceAPI mutations; lint/typecheck/test GREEN).
14. **슬라이스 3 / `s3-a`→`s3-e`** — Domain API + buses + obs **PROVED GREEN**: [`S3A_DOMAIN_API_CONTRACT.md`](../appendix/S3A_DOMAIN_API_CONTRACT.md) + [`S3E_DOMAIN_API_PROVE.md`](../appendix/S3E_DOMAIN_API_PROVE.md) (`domain:<ns>.<method>` only · `[A]`→`jobId` · governance wrap · renderer bus subscribe 0 · lint/typecheck/test GREEN).
15. **`x-a`** — Fortification Master Contract **FROZEN** (code 0): [`XA_FORTIFICATION_CONTRACT.md`](../appendix/XA_FORTIFICATION_CONTRACT.md) — 6 categories → owning to-do map + acceptance criteria; cross-prove later at `x-b`.
16. **`s2-e-a`** — Storage Hardening contract **FROZEN** (code 0): [`S2EA_STORAGE_HARDENING_CONTRACT.md`](../appendix/S2EA_STORAGE_HARDENING_CONTRACT.md) — WAL + IMMEDIATE + repo mutex + `runAtomicWrite` outbox hook (x-a §1/§4 storage half).
17. **슬라이스 2-E / `s2-e-b`→`s2-e-c`** — Storage Hardening **PROVED GREEN**: [`S2EC_STORAGE_HARDENING_PROVE.md`](../appendix/S2EC_STORAGE_HARDENING_PROVE.md) (WAL · IMMEDIATE · repo mutex · `runAtomicWrite` atomic outbox enqueue · Prisma0; lint/typecheck/test GREEN).
18. **슬라이스 4 / `s4-a`→`s4-d`** — Vault + Session + Config **PROVED GREEN**: [`S4A_VAULT_SESSION_CONFIG_CONTRACT.md`](../appendix/S4A_VAULT_SESSION_CONFIG_CONTRACT.md) + [`S4D_SECRETS_PROVE.md`](../appendix/S4D_SECRETS_PROVE.md) (`@clime/vault` encrypted/keychain · `@clime/session` `SessionExpired` · `@clime/config` cascade values/refs · Config≠Governance · `.gitignore` secret block; lint/typecheck/test GREEN).
19. **슬라이스 4.5 / `s4.5-a`→`s4.5-c`** — AI + Cost + Circuit Breaker **PROVED GREEN**: [`S45A_AI_ADAPTER_COST_CONTRACT.md`](../appendix/S45A_AI_ADAPTER_COST_CONTRACT.md) + [`S45C_AI_PROVE.md`](../appendix/S45C_AI_PROVE.md).
20. **슬라이스 5 / `s5-a`→`s5-b`** — CI **PROVED GREEN**: `.github/workflows/ci.yml` (`pnpm run ci:quality` = lint+typecheck+test) · ESLint renderer↛engines/ORM/buses/vault · fixture `apps/desktop/src/renderer/__eslint_fixtures__/forbidden-import.ts` fails lint (`boundary.eslint.test.ts`).
21. **슬라이스 6 / `s6-a`→`s6-c`** — `@clime/ui` **PROVED GREEN**: [`S6C_UI_KIT_PROVE.md`](../appendix/S6C_UI_KIT_PROVE.md) (`--clime-*` = 16 SSOT · whitelist primitives · Card=interaction-only · cliché/hex/token-drift 0; lint/typecheck/test GREEN).
22. **슬라이스 7–8** — Desktop shell + Mission Center UX Gate **PROVED GREEN** (`s7`/`s8` prove docs under `docs/appendix/`).
23. **슬라이스 B1 / `b1-a`→`b1-d`** — Account + Capability Matrix + Registry **PROVED GREEN**: [`B1A_ACCOUNT_CONTRACT.md`](../appendix/B1A_ACCOUNT_CONTRACT.md) + [`B1D_ACCOUNT_PROVE.md`](../appendix/B1D_ACCOUNT_PROVE.md) (`@clime/plugin-sdk` · `@clime/connector-registry` · `@clime/account` · desktop Matrix wiring · Manifest only · lean plugin-sdk · lint/typecheck/test GREEN).
24. **슬라이스 B2 / `b2-a`→`b2-c`** — Wizard + Inbox **PROVED GREEN**: [`B2C_INBOX_WIZARD_PROVE.md`](../appendix/B2C_INBOX_WIZARD_PROVE.md).
25. **슬라이스 B3 / `b3-a`→`b3-d`** — Workflow + Planner Queue + Workers **PROVED GREEN**: [`B3A_WORKFLOW_AUTOMATION_CONTRACT.md`](../appendix/B3A_WORKFLOW_AUTOMATION_CONTRACT.md) + [`B3D_QUEUE_PROVE.md`](../appendix/B3D_QUEUE_PROVE.md) (`@clime/workflow` · `@clime/automation` · Task SM optimistic lock · lease heartbeat · Governor ≤3 · Outbox publisher · START→Queue only · lint/typecheck/test GREEN).
26. **`vg-a`** — Zero-Cost Viral Growth Contract **FROZEN** (code 0): [`VGA_VIRAL_GROWTH_CONTRACT.md`](../appendix/VGA_VIRAL_GROWTH_CONTRACT.md) — 4 items→owning to-do map + `.clime` schema + referral badge rules; prove later at `vg-e`.
27. **슬라이스 C1 / `c1-a`→`c1-d`** — Content core **PROVED GREEN**: [`C1A_CONTENT_CONTRACT.md`](../appendix/C1A_CONTENT_CONTRACT.md) + [`C1D_CONTENT_PROVE.md`](../appendix/C1D_CONTENT_PROVE.md) (`@clime/content` Produce→Validate→Optimize/7-channel Repurpose · Export backup `Exports/YYYY-MM-DD/` · History enums · Validate skip 0 · `.clime`≠Export · lint/typecheck/test GREEN).
28. **슬라이스 F / `f-a`→`f-c`** — Brand + challenge trust **PROVED GREEN**: [`FC_TRUST_PROVE.md`](../appendix/FC_TRUST_PROVE.md) (research Brand→Validate · Publishing History UI · challenge→`PAUSED_CHALLENGE`+Inbox E2E · 침묵실패 0 · lint/typecheck/test GREEN).
29. **슬라이스 G / `g-a`→`g-d`** — Research depth **PROVED GREEN**: [`GA_RESEARCH_DEPTH_CONTRACT.md`](../appendix/GA_RESEARCH_DEPTH_CONTRACT.md) + [`GD_RESEARCH_DEPTH_PROVE.md`](../appendix/GD_RESEARCH_DEPTH_PROVE.md) (Researcher/Competitor/Micro-Audit/Gap/Opportunity/Viral under `growth/research` only · top-level engine 유출 0 · Growth 5 umbrella · vg-a §1 base · lint/typecheck/test GREEN).
30. **`vg-b`→`vg-e`** — Zero-Cost Viral Growth **PROVED GREEN**: [`VGA_VIRAL_GROWTH_CONTRACT.md`](../appendix/VGA_VIRAL_GROWTH_CONTRACT.md) + [`VGE_VIRAL_GROWTH_PROVE.md`](../appendix/VGE_VIRAL_GROWTH_PROVE.md) (Micro-Audit PDF/badge+referral · Multi-Jack pack · `.clime` IO ≠ Export backup · 7-channel c1-b · paid API 0 · domain channels 104 · lint/typecheck/test GREEN).
31. **슬라이스 H / `h-a`→`h-c`** — Planning + Experiments **PROVED GREEN**: [`HC_PLANNING_EXPERIMENT_PROVE.md`](../appendix/HC_PLANNING_EXPERIMENT_PROVE.md) (`@clime/growth-planning` Queue producer polish + Scheduler intel · `@clime/analytics` Experiment A/B · spend HumanGate · autoSpendApplied=0 · Queue/도메인 이탈 0 · lint/typecheck/test GREEN).
32. **슬라이스 I / `i-a`→`i-d`** — Learning + Memory + ROI **PROVED GREEN**: [`IA_LEARNING_MEMORY_ROI_CONTRACT.md`](../appendix/IA_LEARNING_MEMORY_ROI_CONTRACT.md) + [`ID_LEARN_PROVE.md`](../appendix/ID_LEARN_PROVE.md) (`@clime/learning` Confidence≥0.91 · Reflection≠Meta · `@clime/memory` episodes · ROI→Policy · strategy namespace · Meta 오염 0 · 미달 promote 0 · lint/typecheck/test GREEN).
33. **슬라이스 J / `j-a`→`j-c`** — Executive + Goal (Meta slim) **PROVED GREEN**: [`JA_EXECUTIVE_CONTRACT.md`](../appendix/JA_EXECUTIVE_CONTRACT.md) + [`JC_EXECUTIVE_PROVE.md`](../appendix/JC_EXECUTIVE_PROVE.md).
34. **슬라이스 K1 / `k1-a`→`k1-c`** — Settings + Knowledge UI **PROVED GREEN**: [`KA_SETTINGS_KNOWLEDGE_CONTRACT.md`](../appendix/KA_SETTINGS_KNOWLEDGE_CONTRACT.md) + [`KC_SETTINGS_KNOWLEDGE_PROVE.md`](../appendix/KC_SETTINGS_KNOWLEDGE_PROVE.md) (Global→Project→User · Workspace/Team 0 · Persona prefs=`growth/research` · `@clime/growth-knowledge` namespaced · domain channels 111 · UX Gate · lint/typecheck/test GREEN).
35. **슬라이스 K2 / `k2-a`→`k2-c`** — Ship `.exe` **PROVED GREEN**: [`06_SHIP.md`](06_SHIP.md) + [`K2C_SHIP_PROVE.md`](../appendix/K2C_SHIP_PROVE.md) (electron-builder + electron-updater · brand `CLIME AI Growth Studio.exe` · code-sign aware · disk ≥20GB · `scripts/ship-smoke.ps1` · lint/typecheck/test GREEN).
36. **`x-b`** — Fortification Cross-Prove **GREEN**: [`XA_FORTIFICATION_CONTRACT.md`](../appendix/XA_FORTIFICATION_CONTRACT.md) §10 stamped · [`XB_FORTIFICATION_PROVE.md`](../appendix/XB_FORTIFICATION_PROVE.md) (6 categories · s2-e·b3·c2·s4·s4.5·f + Governor/HumanGate · lint/typecheck/test GREEN).
37. **`v1-a`→`v1-d`** — V1 Acceptance / DoD **COMPLETE GREEN**: [`V1A_PRODUCT_LOOP_PROVE.md`](../appendix/V1A_PRODUCT_LOOP_PROVE.md) · [`V1B_ARCHITECTURE_PROVE.md`](../appendix/V1B_ARCHITECTURE_PROVE.md) · [`V1C_QUALITY_PROVE.md`](../appendix/V1C_QUALITY_PROVE.md) · [`V1D_FINAL_SIGNOFF.md`](../appendix/V1D_FINAL_SIGNOFF.md) (제품 루프+learn node · 5락 · CI/E2E · UX Gate · 침묵실패0 · 큐우회0 · Capability 정직).
38. **V1 residual close-out** — [`V1_RESIDUAL_CLOSEOUT.md`](../appendix/V1_RESIDUAL_CLOSEOUT.md) **GREEN**: `@clime/tool` · IA residual surfaces (Projects/Account/Tools/Content/Templates/Queue/Analytics/Export) · plan snapshot sync · ship-smoke path.

## Operator next (V1 closed — dogfood)

```powershell
cd C:\Users\PC\AI_CONTENT_OS
fnm env --use-on-cd | Out-String | Invoke-Expression
fnm use
powershell -ExecutionPolicy Bypass -File scripts\first-run.ps1 -SkipCi
```

See [`04_HOW_TO_OPERATE.md`](04_HOW_TO_OPERATE.md) §8 First Run checklist. Promote only after your own START→Queue→Validate loop is stable.

## Strongly recommended before Electron native builds

1. **Restart Windows** once — VS 2022 Build Tools installer requested reboot to finish.
2. Open a **new** terminal so PATH picks up Ollama / fnm / Build Tools.
3. In repo:

```powershell
cd C:\Users\PC\AI_CONTENT_OS
fnm env --use-on-cd | Out-String | Invoke-Expression
fnm use
powershell -ExecutionPolicy Bypass -File scripts\check-toolchain.ps1
pnpm run ci:quality
```

## Optional (local LLM)

```powershell
ollama pull llama3.2
```

## Phase / slice board (V1 closed)

| # | Slice | Focus |
|---|---|---|
| ~~1~~ | ~~Monorepo infra~~ | **done** |
| ~~1.5~~ | ~~Design Gate~~ | **done** (`16`) |
| ~~1.6~~ | ~~RFC/setup sync~~ | **done** |
| ~~2~~ | ~~Storage~~ | **done** (`s2-a`→`s2-d` GREEN) |
| ~~2.5~~ | ~~Feature→Policy→Runtime~~ | **done** (`s2.5-a`→`s2.5-c` GREEN) |
| ~~3~~ | ~~Domain API + buses + obs~~ | **done** (`s3-a`→`s3-e` GREEN) |
| ~~**X**~~ | ~~Fortification contract~~ | **done** (`x-a` → [`XA_FORTIFICATION_CONTRACT.md`](../appendix/XA_FORTIFICATION_CONTRACT.md)) |
| ~~**2-E**~~ | ~~Storage Hardening~~ | **done** (`s2-e-a`→`c` GREEN — [`S2EC`](../appendix/S2EC_STORAGE_HARDENING_PROVE.md)) |
| ~~**4**~~ | ~~Vault + Session + Config~~ | **done** (`s4-a`→`s4-d` GREEN — [`S4D`](../appendix/S4D_SECRETS_PROVE.md)) |
| ~~**4.5**~~ | ~~AI + Cost + Circuit Breaker~~ | **done** (`s4.5-a`→`c` GREEN — [`S45C`](../appendix/S45C_AI_PROVE.md)) |
| ~~**5**~~ | ~~CI~~ | **done** (`s5-a`→`s5-b` GREEN — `.github/workflows/ci.yml` + renderer boundary lint) |
| ~~**6**~~ | ~~`@clime/ui`~~ | **done** (`s6-a`→`s6-c` GREEN — [`S6C`](../appendix/S6C_UI_KIT_PROVE.md)) |
| ~~**7–8**~~ | ~~Desktop shell + Mission Center~~ | **done** (`s7`/`s8` GREEN) |
| ~~**B1**~~ | ~~Account + Matrix + Registry~~ | **done** (`b1-a`→`b1-d` GREEN — [`B1D`](../appendix/B1D_ACCOUNT_PROVE.md)) |
| ~~**B2**~~ | ~~Wizard + Inbox~~ | **done** (`b2-a`→`b2-c` GREEN — [`B2C`](../appendix/B2C_INBOX_WIZARD_PROVE.md)) |
| ~~**B3**~~ | ~~Workflow + Queue~~ | **done** (`b3-a`→`b3-d` GREEN — [`B3A`](../appendix/B3A_WORKFLOW_AUTOMATION_CONTRACT.md) + [`B3D`](../appendix/B3D_QUEUE_PROVE.md)) |
| ~~**VG-A**~~ | ~~Viral Growth contract~~ | **done** (`vg-a` → [`VGA_VIRAL_GROWTH_CONTRACT.md`](../appendix/VGA_VIRAL_GROWTH_CONTRACT.md); code 0) |
| ~~**C1**~~ | ~~Content core~~ | **done** (`c1-a`→`c1-d` GREEN — [`C1A`](../appendix/C1A_CONTENT_CONTRACT.md) + [`C1D`](../appendix/C1D_CONTENT_PROVE.md)) |
| ~~**C2**~~ | ~~Auto-publish / BAE~~ | **done** (`c2-a`→`c2-d` GREEN — [`C2A`](../appendix/C2A_PUBLISH_LADDER_CONTRACT.md) + [`C2D`](../appendix/C2D_PUBLISH_PROVE.md)) |
| ~~**D**~~ | ~~Research MVP + Topic~~ | **done** (`d-a`→`d-d` GREEN — [`DA`](../appendix/DA_RESEARCH_TOPIC_CONTRACT.md) + [`DD`](../appendix/DD_GROWTH_MVP_PROVE.md)) |
| ~~**E**~~ | ~~Revenue + Decision~~ | **done** (`e-a`→`e-d` GREEN — [`EA`](../appendix/EA_REVENUE_DECISION_CONTRACT.md) + [`ED`](../appendix/ED_DECIDE_PROVE.md)) |
| ~~**F**~~ | ~~Brand + challenge E2E~~ | **done** (`f-a`→`f-c` GREEN — Brand→Validate · History UI · challenge E2E · [`FC`](../appendix/FC_TRUST_PROVE.md)) |
| ~~**G**~~ | ~~Research depth~~ | **done** (`g-a`→`g-d` GREEN — [`GA`](../appendix/GA_RESEARCH_DEPTH_CONTRACT.md) + [`GD`](../appendix/GD_RESEARCH_DEPTH_PROVE.md)) |
| ~~**VG**~~ | ~~Zero-Cost Viral Growth~~ | **done** (`vg-a`→`vg-e` GREEN — [`VGA`](../appendix/VGA_VIRAL_GROWTH_CONTRACT.md) + [`VGE`](../appendix/VGE_VIRAL_GROWTH_PROVE.md)) |
| ~~**H**~~ | ~~Planning + Experiments~~ | **done** (`h-a`→`h-c` GREEN — [`HC`](../appendix/HC_PLANNING_EXPERIMENT_PROVE.md)) |
| ~~**I**~~ | ~~Learning + Memory + ROI~~ | **done** (`i-a`→`i-d` GREEN — [`IA`](../appendix/IA_LEARNING_MEMORY_ROI_CONTRACT.md) + [`ID`](../appendix/ID_LEARN_PROVE.md)) |
| ~~**J**~~ | ~~Executive + Goal (Meta slim)~~ | **done** (`j-a`→`j-c` GREEN — [`JA`](../appendix/JA_EXECUTIVE_CONTRACT.md) + [`JC`](../appendix/JC_EXECUTIVE_PROVE.md)) |
| ~~**K1**~~ | ~~Settings + Knowledge UI~~ | **done** (`k1-a`→`k1-c` GREEN — [`KA`](../appendix/KA_SETTINGS_KNOWLEDGE_CONTRACT.md) + [`KC`](../appendix/KC_SETTINGS_KNOWLEDGE_PROVE.md)) |
| ~~**K2**~~ | ~~Ship `.exe`~~ | **done** (`k2-a`→`k2-c` GREEN — [`06_SHIP`](06_SHIP.md) + [`K2C`](../appendix/K2C_SHIP_PROVE.md)) |
| ~~**X**~~ | ~~Fortification cross-prove~~ | **done** (`x-b` GREEN — [`XA`](../appendix/XA_FORTIFICATION_CONTRACT.md) + [`XB`](../appendix/XB_FORTIFICATION_PROVE.md)) |
| ~~**V1**~~ | ~~Acceptance / DoD~~ | **done** (`v1-a`→`v1-d` GREEN — [`V1D`](../appendix/V1D_FINAL_SIGNOFF.md)) |
| ~~**V1-R**~~ | ~~Residual close-out~~ | **done** ([`V1_RESIDUAL_CLOSEOUT`](../appendix/V1_RESIDUAL_CLOSEOUT.md) — tool + IA surfaces) |
| **L+** | Phase L+ (explicit non-scope) | **next (optional)** — Ads/CRM/Team/Marketplace/Postgres port only via Registry + Domain API |

**V1 DB:** SQLite via Drizzle only. **Supabase/Postgres = not V1** (Repository port later / L+).

V1 is closed (including residual IA/`@clime/tool`). For L+ work, ask Cursor with an explicit Phase L+ to-do — do not reopen V1 core locks.
