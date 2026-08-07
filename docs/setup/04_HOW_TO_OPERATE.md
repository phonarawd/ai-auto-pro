# How to Operate — Beginner Gate (Cursor + CLIME Growth OS)

이 문서는 **왕초보자**가 Cursor로 이 저장소를 다룰 때 따라야 할 최소 운영 규칙입니다.
아키텍처 상세는 `docs/architecture/*` / 마스터 플랜을 보세요. 여기는 **승인 · 중단 · 롤백 · 위험 신호**만 다룹니다.

---

## 1. 이 프로젝트가 무엇인지 (한 줄)

**CLIME AI Growth Studio** = 로컬 Growth OS. **V1 Acceptance = COMPLETE**
([`V1D_FINAL_SIGNOFF.md`](../appendix/V1D_FINAL_SIGNOFF.md)).
잔여 IA/`@clime/tool`까지 닫힘: [`V1_RESIDUAL_CLOSEOUT.md`](../appendix/V1_RESIDUAL_CLOSEOUT.md).

V1 핵심 루프(워크플로 노드):
`연구 → 결정 → 생성 → 검증 → 자동게시 → Export 백업 → 측정 → 학습`.
Mission Center: `START → Planner Queue → Worker`. Export는 **백업 기록**,
유료 광고 지출은 **항상 HumanGate**입니다. Ops 드로어(Projects/Account/Tools/Queue/Analytics/Export)는
Quick Actions 또는 **Ops** 버튼으로 엽니다.

---

## 2. 작업 시작 전 체크

```powershell
cd C:\Users\PC\AI_CONTENT_OS
fnm env --use-on-cd | Out-String | Invoke-Expression
fnm use
powershell -ExecutionPolicy Bypass -File scripts\check-toolchain.ps1
```

- **GREEN**이 아니면 Phase A(앱 코드)를 시작하지 마세요.
- 패키지 매니저는 **pnpm only**.

운영 가이드 / 규칙:

| 문서 | 용도 |
|---|---|
| `00_TOOLCHAIN.md` | 필수 프로그램 |
| `01_DEV_RULES.md` | 헌법·아키텍처 락 |
| `02_TOOLCHAIN_AUDIT.md` | 감사 기록 |
| `03_NEXT_ACTIONS.md` | 다음 할 일 |
| `docs/architecture/02_CONSTITUTION.md` | 바인딩 규칙 |

---

## 3. Cursor에게 일을 맡길 때 (승인 습관)

1. **한 번에 한 단계** — “Phase A 전체”보다 “Domain API 스캐폴드”처럼 좁게.
2. **계획 먼저** — 큰 변경은 Plan 모드 / 짧은 계획 문단을 확인한 뒤 승인.
3. **명시적 승인** — Electron/앱 코드는 문서 Phase 0 이후 **당신이 승인한 뒤에만**.
   게이트 문서: `05_IMPL_APPROVAL.md`. 승인 문구 예: `Approve Phase A` / `Approve implementation` / `Phase A 승인`.
4. **커밋도 요청할 때만** — 에이전트가 勝手に commit하지 않게; 필요하면 “커밋해줘”라고 말하세요.
5. **비밀 금지** — API 키·세션·`.env`를 채팅/git에 넣지 마세요. Vault / OS keychain만.

---

## 4. 언제 멈춰야 하는가 (Stop)

즉시 멈추고 Inbox/로그를 보세요:

| 신호 | 의미 | 행동 |
|---|---|---|
| Challenge / captcha / lock | 플랫폼이 자동화에 저항 | **자동 일시정지**가 정상. 우회 시도 금지. 재연결만 |
| Kill Switch | 거버넌스 긴급 중단 | 원인 확인 전 재개 금지 |
| Capability / riskLevel 거부 | Matrix가 게시를 막음 | 계정·권한·모드(`api`/`session`) 확인 |
| 비밀 유출 의심 | 키/토큰이 파일·커밋에 노출 | 키 회전 + 커밋에서 제거 + 푸시 중단 |
| CI red (lint/typecheck/test) | 품질 게이트 실패 | 머지/다음 페이즈 금지 |

**절대 하지 말 것:** 캡차 우회 · 지문 위장 · 프록시 신분세탁 · 비동의 대량 DM/봇넷.

---

## 5. Rollback / 롤백 (간단)

```powershell
cd C:\Users\PC\AI_CONTENT_OS
git status
git log --oneline -10
```

- **아직 커밋 안 함:** 잘못된 파일만 되돌리기 (`git checkout -- <file>` 또는 IDE Local History).
  전체 폐기가 필요할 때만 `git restore .` — **주의: 미커밋 작업 전부 사라짐**.
- **커밋함, 아직 push 안 함:** 잘못된 최신 커밋이면 새 수정 커밋으로 고치기(amend는 요청 시에만).
- **이미 push함:** revert 커밋으로 되돌리기. `main`에 force-push 금지.
- **DB/Export:** SQLite 파일 백업본 + `Exports/YYYY-MM-DD/` 폴더가 1차 복구 수단 (`12_INFRASTRUCTURE.md`).

---

## 6. 게시 경로 기억 (헷갈리면 여기)

```text
공식 API 가능? → API 자동게시 (P0)
아니면 → BAE 세션 자동게시 (P1)
항상 → Export 백업 로그
챌린지 → 자동 일시정지 + Inbox
유료 광고 지출 → 항상 HumanGate
```

Capability Matrix는 차단기가 아니라 상태판입니다:
`canPublish` + `publishMode(api|session)` + `riskLevel(low|medium|high)`.

---

## 7. Phase 진행 규칙

| 단계 | 조건 |
|---|---|
| Phase 0 | RFCs 완료 |
| Phase A 진입 | `05_IMPL_APPROVAL.md` **APPROVED** + toolchain GREEN |
| V1 Acceptance | **COMPLETE** — `v1-a`→`v1-d` GREEN ([`V1D`](../appendix/V1D_FINAL_SIGNOFF.md)) |
| 각 Phase 종료 | 해당 RFC Acceptance + CI green — `check-toolchain` / `check-phase0` 습관 |
| Phase K 출시 | installer / 코드서명 인지 / electron-updater — SSOT: [`06_SHIP.md`](06_SHIP.md) |
| Phase L+ | V1 밖 — Ads/CRM/Team/Marketplace/Postgres 포트만; 코어 엔진 불변 |

다음 액션 목록: `03_NEXT_ACTIONS.md` (V1 closed → optional L+).

---

## 8. First Run — Mission Center까지 (지금 할 일)

개발 플랜은 끝났습니다. **다음 단계는 본인 PC에서 한 바퀴 돌리기**입니다.

```powershell
cd C:\Users\PC\AI_CONTENT_OS
fnm env --use-on-cd | Out-String | Invoke-Expression
fnm use
# 빠른 실행 (CI 생략):
powershell -ExecutionPolicy Bypass -File scripts\first-run.ps1 -SkipCi
# 또는 수동:
pnpm --filter @clime/desktop build
pnpm --filter @clime/desktop start
```

| 순서 | 화면에서 | 성공 기준 |
|---|---|---|
| 1 | Mission Center 브랜드 + 오늘 미션 + CTA | 빈 창이 아님 |
| 2 | Quick Actions / Wizard | 스킵 가능, 나중에 재개 |
| 3 | `[START]` | 즉시 `jobId` · Planner Queue 등록 · Inbox 진행 |
| 4 | 상태판 | `canPublish` / `publishMode` / `riskLevel` + Trace |
| 5 | challenge 시 | 자동 pause + Inbox (우회 CTA 없음) |
| 6 | `[내보내기 백업]` | Export = 백업 로그 only |
| 7 | Ops | Projects / Account / Tools / Queue / Analytics / Export |

데이터 DB: `%APPDATA%\clime-growth-studio\data\clime-growth.sqlite` (Electron `userData`).

`pnpm --filter @clime/desktop start`는 Electron ABI로 `better-sqlite3`를 리빌드합니다.
창을 닫은 뒤 테스트/CI 전에 Node용으로 되돌리려면:
`pnpm --filter @clime/desktop run rebuild:node-native`
(`first-run.ps1`은 종료 시 자동 복구).

선택(로컬 LLM): `ollama pull llama3.2` 후 AI Connection Wizard.

**홍보:** 위 루프가 자기 계정에서 안정된 뒤에 Zero-Cost Viral(Micro-Audit / Multi-Jack / `.clime`)로 시작. 대중 배포 전 코드서명·업데이트 피드는 `06_SHIP.md`.

---

## 9. Ship / `.exe` (Phase K2)

| 항목 | 규칙 |
|---|---|
| 앱 브랜드 | **CLIME AI Growth Studio** → `CLIME AI Growth Studio.exe` |
| 디스크 | 패키징 전 `C:` **≥20 GB** 여유 (`check-toolchain` / `ship-smoke` 게이트) |
| 스모크 | `powershell -ExecutionPolicy Bypass -File scripts\ship-smoke.ps1` |
| 코드서명 | 로컬 unsigned 스모크 OK; 배포는 Authenticode 인지 — 상세 `06_SHIP.md` |
| 업데이트 | `electron-updater` (packaged only); feed URL은 `electron-builder.yml` `publish` |

상세: [`06_SHIP.md`](06_SHIP.md). Prove: [`../appendix/K2C_SHIP_PROVE.md`](../appendix/K2C_SHIP_PROVE.md).

---

## 10. 도움이 더 필요하면

0. **앱 사용법(왕초보·전체 기능):** [`07_BEGINNER_USER_MANUAL.md`](07_BEGINNER_USER_MANUAL.md)
1. `README.md` Quick links
2. `docs/architecture/01_PRODUCT.md` (제품)
3. `docs/architecture/02_CONSTITUTION.md` (규칙)
4. `docs/architecture/15_DESKTOP_AND_ROADMAP.md` (로드맵)
5. `docs/setup/06_SHIP.md` (installer / updater / 코드서명)
