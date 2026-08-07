# K1-A Settings + Knowledge Contract (FROZEN)

**Status:** FROZEN — plan to-dos `k1-a` / `k1-b` (architecture already closed; this appendix freezes Domain/UI bindings)  
**Date:** 2026-08-07  
**SSOT parents:** [`02_CONSTITUTION.md`](../architecture/02_CONSTITUTION.md), [`11_MEMORY_KNOWLEDGE.md`](../architecture/11_MEMORY_KNOWLEDGE.md), [`13_GOVERNANCE.md`](../architecture/13_GOVERNANCE.md), [`S4A_VAULT_SESSION_CONFIG_CONTRACT.md`](S4A_VAULT_SESSION_CONFIG_CONTRACT.md), [`15_DESKTOP_AND_ROADMAP.md`](../architecture/15_DESKTOP_AND_ROADMAP.md), [`16_DESIGN_SYSTEM.md`](../architecture/16_DESIGN_SYSTEM.md)

---

## 1. Ownership

| Concern | Owner | Notes |
|---|---|---|
| Config cascade values | `@clime/config` | Global→Project→User; Config ≠ Governance |
| Settings Domain handlers | `@clime/config` → `settings.*` | Desktop host wires ConfigStore |
| Persona / Emotion **prefs** | `@clime/growth-research` | Prefs only — not a full Persona engine |
| Knowledge Store façade | `@clime/growth-knowledge` | Access layer over Storage `KnowledgeItem` |
| Knowledge Domain handlers | `@clime/growth-knowledge` → `knowledge.*` | One store + namespaces |
| Settings / KB UI | `@clime/desktop` renderer | Domain API only; secondary panels |

---

## 2. Settings cascade

- Scopes: **`global` | `project` | `user`** only (`settingsScopeSchema`).
- Effective read: **User > Project > Global**.
- UI tabs: Global / Project / User — **Workspace / Team Mode settings = 0** (L+).
- Forbidden keys: `governance.*` / `feature.*` / `policy.*` / `capability.*` / kill-switch / `workspace*` / `team*`.
- Secrets: VaultRef envelopes only (plaintext rejected).

Domain methods (existing map):

| Method | Behavior |
|---|---|
| `settings.getGlobal` / `getProject` / `getUser` | List layer items + `effectiveSource` |
| `settings.setGlobal` / `setProject` / `setUser` | Set value envelope; Workspace keys → `WORKSPACE_FORBIDDEN` |

---

## 3. Persona / Emotion prefs

- Persist: Knowledge `namespace=growth`, `type=persona_prefs`, kind `growth.persona_prefs`.
- Domain: `growth.getPersonaPrefs` / `growth.setPersonaPrefs`.
- Settings UI hosts prefs editors; **engine ownership remains research**.
- Non-goal: scoring / full Persona or Emotion engines.

---

## 4. Knowledge Store UI

- Namespaces V1: `brand` · `growth` · `competitor` · `system` · `strategy`.
- Domain: `knowledge.list` / `get` / `search` / `put` / `delete`.
- Search: in-memory filter over list (no FTS table in V1).
- Forbidden: parallel `*Knowledge` god tables / Prisma / Supabase.

---

## 5. UX

- Secondary panels from Mission Center (header + Quick Actions).
- Mission Center home unchanged (brand + CTA + 상태판).
- Pretendard + `--clime-*`; Domain API path only in renderer.

---

## 6. Explicit non-goals

- Team Mode / Workspace settings
- AI CEO / Paid Ads OS
- `.exe` ship (K2)
- Full Persona/Emotion engines beyond prefs
