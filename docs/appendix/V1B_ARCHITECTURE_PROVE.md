# V1-B Constitution · Architecture Prove (GREEN)

**Status:** GREEN — plan to-do `v1-b` (GROK4.5/256K)  
**Date:** 2026-08-07  
**SSOT:** [`02_CONSTITUTION.md`](../architecture/02_CONSTITUTION.md) · Plan V1 DoD → 아키텍처  
**Scope:** Audit + ESLint growth-knowledge boundary closure

---

## 1. Five constitutional locks

| Lock | Status | Evidence |
|---|---|---|
| Plugin Contract First | **PASS** | `@clime/plugin-sdk` Manifest · Connector Registry · `plugins/connectors/README.md` |
| Schema Versioning | **PASS** | `SCHEMA_VERSION` · Zod IPC envelope · Workflow DSL `schema_version` |
| Task State Machine | **PASS** | `QUEUED→…→PUBLISHED` · Validate-skip 0 · terminals incl. `PAUSED_CHALLENGE` |
| No AI Vendor Dependency | **PASS** | `@clime/ai` Adapter-only · zero vendor SDK imports in product TS |
| Everything is a Workflow | **PASS** | Daily Growth nodes include Validate · Publish · Measure · **Learn** |

---

## 2. Layering & ownership

| Gate | Status | Evidence |
|---|---|---|
| UI → IPC → Domain API only | **PASS** | Preload `domainClient` · ESLint renderer forbid list includes all 5 `@clime/growth-*` |
| AI vendor behind Adapters only | **PASS** | `packages/ai` deps scan · prove.v1b |
| Growth umbrella 5 | **PASS** | Topic∈planning · Persona/Brand∈research |
| not Prisma / Supabase / Postgres client = 0 | **PASS** | workspace `package.json` dep scan |
| Engines ↛ Drizzle direct | **PASS** | `drizzle-orm` / `better-sqlite3` only under `packages/storage` |
| Fortification x-b retained | **PASS** | [`XB`](XB_FORTIFICATION_PROVE.md) |

---

## 3. Gap closed in this part

| Gap | Fix |
|---|---|
| ESLint omitted `@clime/growth-knowledge` from renderer forbid list | Added package + `/*` to `RENDERER_FORBIDDEN_IMPORT_PATTERNS` |

---

## 4. Test verification

| Artifact | Role |
|---|---|
| `apps/desktop/src/prove.v1b.test.ts` | Constitution / boundary / ORM / vendor scan |
| `eslint.config.js` | Renderer ↔ engine boundary |
| Prior | [`S3E`](S3E_DOMAIN_API_PROVE.md) · [`S2D`](S2D_STORAGE_PROVE.md) · [`XB`](XB_FORTIFICATION_PROVE.md) |

---

## 5. Slice V1-B Acceptance Sign-Off

| Part | Model | Status |
|---|---|---|
| `v1-b` ARCHITECTURE AUDIT | GROK4.5 | **GREEN** |

**Next to-do:** `v1-c` — COMPOSER2.5 — CI green + core E2E + check-toolchain/check-phase0.
