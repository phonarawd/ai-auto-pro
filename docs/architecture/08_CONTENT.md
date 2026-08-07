# 08 — Content: Produce, Validate, SEO/Hook, Repurpose, Export Backup

**Status:** Phase 0 RFC
**Package:** `packages/content/`
**Rule:** Content produces after Topic/Decision — it does not own daily mix.

---

## 1. Responsibilities

```text
Content Intelligence
├── Hook / Thumbnail / Title / Hashtag Intelligence
├── SEO Intelligence
├── Cross-Platform Optimizer
├── Quality Scoring
└── Brand application (Brand Intelligence rules)
```

Plus: Produce · Validate · Optimize · Repurpose · Export backup · Publishing History hooks · publish orchestration handoff to connectors.

---

## 2. Place in Agent Loop

```text
… → Generate → Validate → Optimize → Publish (+ Export backup) → …
```

**Validate** is mandatory (constitutional). Owned here with Brand rules from Growth/research Brand Intelligence.

---

## 3. Generation with accounts

User: “오늘 글 하나 만들어줘”

AI prepares: blog + IG + Reels + Shorts + TikTok + Naver variant…

Each artifact stores:

- `targetAccountId`
- channel + format metadata
- UI cue: “CLIME 계정으로 작성 ○”

Grounding: Brand + Knowledge Store + account profile metadata (bio, categories).

Account Router (Account Engine) picks targets before/at generate:

- Campaign `이벤트` → IG `clime_event` + Threads/TikTok event
- Campaign `브랜드` → IG Official + Facebook Official

---

## 4. Validate (required node)

Checks before Optimize/Publish:

| Check | Source |
|---|---|
| Brand tone / voice | Brand Intelligence |
| Forbidden phrases | Brand rules |
| **High-risk finance / exaggerated earnings claims** | Brand + policy filter (reject or rewrite) |
| Format / length / schema | Channel templates |
| JSON/schema_version (Zod) | Artifact contract |
| Capability preflight | Matrix (`canPublish`, `publishMode`, `riskLevel`) |

Failures → repair loop or `FAILED` / return to Generate per Policy. Never skip to live publish.

---

## 5. Optimize & Repurpose

- Cross-platform transform: blog → IG/Reels/Shorts/Threads/TikTok/X/Naver variants
- Hook / Title / Thumb / Hashtag passes
- SEO pass for long-form
- Quality scoring gates “READY”

---

## 6. Export packs (backup log + P2 fallback)

Export is a **parallel backup record** alongside auto-publish, and the always-available P2 manual path. Example layout:

```text
Exports/2026-08-07/
  Blog.md
  Instagram.txt
  Threads.txt
  X.txt
  TikTok.txt
  YouTube_Shorts.txt
  NaverBlog.md
  Hashtags.txt
  Images/Thumbnail.png
  Prompt.txt
  accounts.json          # which account each file targets
```

- Manifest includes `schema_version`
- Written on successful (or attempted) publish for audit/recovery
- Core emits `PublishReadyPayload` + `accountId`

### Live auto-publish

Connector packages implement platform publish **iff** Matrix `canPublish` with `publishMode: api|session`. Core never imports Instagram/Naver SDKs directly.

---

## 7. Publishing History

Per content × platform status:

`draft | export | scheduled | posted_manual | posted_api | posted_session`

Operations layer UI under Content. Challenge pause must not silently flip to a posted_* state.

---

## 8. Task states (content-relevant)

Maps to global machine in `05_WORKFLOW.md`:

`QUEUED → RUNNING → VALIDATING → OPTIMIZING → READY → PUBLISHED`

`PUBLISHED` records `publishMode: api|session` (plus Export backup event). Terminal `PAUSED_CHALLENGE` when health detects challenge.

---

## 9. Domain API

| Method | Intent |
|---|---|
| `ContentAPI.enqueueGenerate` | Command |
| `ContentAPI.getArtifact` | Query |
| `ContentAPI.validate` | Command / node |
| `ContentAPI.exportPack` | Command (backup / P2) |
| `ContentAPI.listHistory` | Query |

---

## 10. Events

| Event | Meaning |
|---|---|
| `ContentGenerated` | Draft artifacts ready |
| `ContentValidated` | Passed checks |
| `ContentReadyForReview` | Human gate when Policy/risk requires |
| `ContentExported` | Export backup pack written |
| `ContentPublishedApi` | API auto-publish |
| `ContentPublishedSession` | BAE session auto-publish |
| `ContentPublishPaused` | Challenge / health pause → Inbox |

---

## 11. SEO / Hook modules (V1 vs L+)

| Module | V1 | L+ |
|---|---|---|
| SEO basics (on-page, titles, keywords) | Yes | Rank track, backlinks, clusters |
| Hook/Title/Thumb/Hashtag | Yes | Ads Creative AI swaps |
| Landing Page AI | No | Expansion Map #2 |

---

## 12. Quality & Brand

- Quality Scoring influences READY vs regenerate
- Brand application must run in Validate even if Generate used brand prompts
- “CLIME답지 않음” is a first-class reject reason
- High-risk finance / exaggerated profit claims are first-class Validate failures

---

## 13. Anti-patterns

1. Content Engine deciding “make 15 reels today” (Decision’s job)
2. Skipping Validate under Feature flag “speed mode” for publish
3. Writing platform SDKs into content package
4. Export without `accounts.json` / schema_version
5. Treating manual paste as `posted_api` / `posted_session`
6. Captcha bypass or stealth stacks to force publish

---

## 14. Cross-references

- Workflow Validate node → `05_WORKFLOW.md`
- Decision/Topic → `06_GROWTH.md`
- AI providers → `07_AI.md`
- Capability / session publish → `10_ACCOUNT.md`
- Analytics measure → `09_ANALYTICS.md`

---

## 15. Acceptance (Phase 0)

- [x] Validate mandatory in loop (incl. finance/earnings filter)
- [x] Export = backup log + P2 fallback
- [x] Account-aware artifacts
- [x] Publishing History includes `posted_session`
- [x] No platform SDK in core Content
