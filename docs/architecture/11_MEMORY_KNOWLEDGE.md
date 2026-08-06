# 11 — Memory · Knowledge Store · Learning · Reflection

**Status:** Phase 0 RFC  
**Rule:** Memory ≠ Knowledge ≠ Learning ≠ Reflection — no overlapping ownership.

---

## 1. Cognition chain

```text
Memory (episodes/facts)
  → Knowledge Store (namespaces + type/tags + Evolution)
  → Learning (policies + Confidence Score)
  → Reflection (postmortems → propose Policy Update → Learning)
```

| Concern | Package / home |
|---|---|
| Episodes / facts | `packages/memory/` (Memory Engine) |
| Curated docs / patterns | Knowledge Store (unified) + Growth/knowledge access |
| Policies + Confidence | `packages/learning/` |
| Postmortems / proposals | `packages/learning/` (Reflection) |

Meta does **not** own Reflection. Strategy playbooks live in Knowledge `namespace=strategy`.

---

## 2. Memory Engine (episodes only)

### Kinds

User / Campaign / Keyword / Brand / AI (facts).

### Horizons

```text
Short → Long (~30d) → Archive
```

### Rules

- Policies do **not** live in Memory tables (Learning owns policies).  
- Curated assets do **not** live in Memory (Knowledge Store).  
- Example episode: “CTR 11% on Reels topic X (date)”.

---

## 3. Knowledge Store (unified)

Single store — **no** parallel god-classes (`GrowthKnowledge`, `CompetitorKnowledge`, …) in V1.

### Item shape

| Field | Purpose |
|---|---|
| `namespace` | `brand \| growth \| competitor \| system \| strategy \| …` |
| `type` | doc / pattern / playbook / rule / … |
| `tags` | freeform + controlled |
| `body` / `blobRef` | content |
| Evolution scores | use / quality / freshness |
| `schema_version` | required on JSON bodies |

### Knowledge Evolution

Lifecycle: use → score → promote / demote / retire / regenerate.

### UI

One browser filtered by namespace / type / tags (Account ops § Knowledge Store UI).

### Growth access

`packages/growth/knowledge/` is a façade — not a second store.

---

## 4. Learning Engine

- Stores **policies** with **Confidence Score**  
- Auto-promote only if Confidence ≥ threshold (e.g. 91%)  
- Low confidence (e.g. 31%) = suggest only / no change  
- Experiment winners and ROI patterns are inputs  
- Writes may update Policy rules (governance) when approved  

---

## 5. Reflection

- Analyzes outcomes (postmortems)  
- Proposes Policy Updates → Learning (with confidence)  
- May suggest Executive reallocations (week/month) — does not enqueue daily Decision ranks  
- Human confirm for aggressive rules / Memory writes  

---

## 6. Cross-project (L+)

Expansion #11 Knowledge Evolution 2.0: success→pattern→rule→**cross-project** apply — opt-in per project. V1 stays single-project scoped.

---

## 7. Domain API

| API | Role |
|---|---|
| `MemoryAPI.*` | Browse/search episodes |
| `KnowledgeAPI.*` | CRUD/search/evolve |
| `LearningAPI.*` | List policies, accept/reject proposals, confidence |

---

## 8. Events

| Event | Meaning |
|---|---|
| `KnowledgeItemPromoted` | Evolution up |
| `LearningPolicyProposed` | Awaiting accept / auto if high confidence |
| `LearningPolicyActivated` | In force |
| `ReflectionCompleted` | Postmortem filed |

---

## 9. Data honesty & privacy

- Vault for any secret-bearing snippets (never in Knowledge plaintext if credential-like)  
- Capability-gated research → Knowledge only with provenance tags  
- User confirm for aggressive automation memories  

---

## 10. Anti-patterns

1. Meta owning Reflection or Learning  
2. Decision Engine writing policies directly  
3. Multiple Knowledge databases per flavor  
4. Auto-promote at low confidence  
5. Storing API keys in Knowledge items  

---

## 11. Cross-references

- Constitution cognition → `02_CONSTITUTION.md`
- Growth knowledge façade → `06_GROWTH.md`
- Analytics → Learning → `09_ANALYTICS.md`
- DB `KnowledgeItem` → `14_DATABASE.md`
- Governance Policy → `13_GOVERNANCE.md`

---

## 12. Acceptance (Phase 0)

- [x] Four-way ownership split
- [x] Unified Knowledge Store + namespaces
- [x] Confidence threshold for auto-promote
- [x] Reflection → Learning path
- [x] Memory = episodes only
