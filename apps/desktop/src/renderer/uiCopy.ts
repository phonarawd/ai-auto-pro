/**
 * 왕초보용 화면 문구 SSOT — 개발/영문 용어 대신 직관적 한국어.
 * 내부 코드 값(QUEUED, canPublish…)은 그대로 두고, 보이는 글자만 여기서 바꾼다.
 */

export const COPY = {
  brandSubtitle: "오늘 할 홍보·성장을 한곳에서 진행하세요",

  nav: {
    quick: "빠른 실행",
    executive: "주간·월간 목표",
    settings: "설정",
    knowledge: "자료실",
    history: "올린 기록",
    menu: "전체 메뉴",
    inbox: "알림함",
  },

  missionLabel: "오늘 할 일",

  cta: {
    start: "오늘 홍보 시작",
    review: "글 확인",
    publish: "자동으로 올리기",
    export: "파일로 보관",
  },

  status: {
    title: "지금 상황",
    honesty: "이 계정으로 지금 할 수 있는 것만 표시합니다.",
    canPublishYes: "지금 올릴 수 있음",
    canPublishNo: "지금은 올릴 수 없음",
    publishMode: "올리는 방식",
    risk: "위험도",
    workState: "작업 진행",
    lastJob: "최근 작업 번호",
    trace: "문제 추적 번호",
    none: "없음",
    accountsTitle: "연결된 SNS 계정",
    accountsEmpty: "아직 연결된 계정이 없습니다. 「처음 연결 도우미」에서 연결하세요.",
    accountsConnected: "연결됨",
    accountsLoginSaved: "로그인 정보 저장됨",
    accountsOpen: "계정 연결 보기",
  },

  whyTitle: "오늘 이 일을 고른 이유",

  reviewTitle: "올리기 전 글 확인",
  reviewBody: "만든 글을 확인한 뒤, 문제 없으면 「자동으로 올리기」를 누르세요.",

  quickTitle: "빠른 실행",

  challenge: {
    badge: "확인 필요 · 일시정지",
    title: "올리기가 잠시 멈췄습니다",
    body: "사이트에서 본인 확인(캡차·잠금)이 필요합니다. 알림함에서 내용을 본 뒤, 해당 사이트에서 직접 확인하세요. 자동으로 넘어가는 방법은 없습니다.",
    openInbox: "알림함 보기",
    resume: "확인 후 다시 올리기",
  },

  inbox: {
    title: "알림함",
    subtitle: "진행 상황 · 확인 필요 · 안내",
    challengeBanner: "본인 확인이 필요해 자동 올리기가 멈췄습니다. 계정에서 직접 확인한 뒤 다시 시작하세요.",
    close: "닫기",
    markRead: "읽음",
    dismiss: "지우기",
  },

  surfaces: {
    projects: "내 프로젝트",
    account: "계정 연결",
    tools: "도구·브라우저",
    content: "글·콘텐츠",
    templates: "작업 템플릿",
    queue: "대기줄·키워드",
    analytics: "성과 보기",
    export: "파일로 보관",
  },

  publishMode: {
    api: "공식 연결",
    session: "브라우저 로그인",
  } as const,

  risk: {
    low: "낮음",
    medium: "보통",
    high: "높음",
  } as const,

  workState: {
    QUEUED: "대기 중",
    RUNNING: "진행 중",
    VALIDATING: "검사 중",
    OPTIMIZING: "다듬는 중",
    READY: "준비됨",
    PUBLISHED: "올리기 완료",
    PAUSED_CHALLENGE: "확인 필요·일시정지",
  } as const,

  settings: {
    title: "설정",
    global: "전체",
    project: "이 프로젝트",
    user: "내 설정",
    cascadeTitle: "적용 중인 값",
    addKey: "항목 추가",
    addSave: "추가 / 저장",
    personaTitle: "말투·감정 설정",
    personaHelp: "글 쓸 때 참고할 말투와 감정 톤입니다. (고급 엔진이 아니라 간단 메모예요.)",
    personas: "말투 목록",
    personasHint: "말투 (쉼표로 구분)",
    emotions: "감정 (쉼표로 구분)",
    notes: "메모",
    savePersona: "말투·감정 저장",
    personaSaveFail: "말투·감정 저장에 실패했습니다.",
    effective: "적용 위치",
  },

  knowledge: {
    title: "자료실",
    subtitle: "브랜드·전략·메모를 모아 둡니다",
    searchPlaceholder: "내용·태그 검색…",
    search: "검색",
    items: "목록",
    empty: "이 주제에는 아직 자료가 없습니다.",
    selected: "선택한 자료",
    putTitle: "자료 넣기",
    type: "종류",
    tags: "태그",
    tagsPlaceholder: "태그, 쉼표로 구분",
    bodyPlaceholder: "글 내용 또는 JSON",
    put: "이 주제에 저장",
    delete: "삭제",
    noTags: "태그 없음",
    id: "번호",
  },

  history: {
    title: "올린 기록",
    subtitle: "초안 · 보관 · 예약 · 올린 결과",
    occurred: "시각",
    content: "글",
    exportPath: "보관 파일",
    externalPost: "올라간 글 번호",
    mode: "방식",
    kinds: {
      draft: "초안",
      export: "파일 보관",
      scheduled: "예약",
      posted_manual: "직접 올림",
      posted_api: "공식 연결로 올림",
      posted_session: "브라우저로 올림",
    },
  },

  executive: {
    title: "주간·월간 목표",
    subtitle: "큰 방향만 봅니다. 오늘 할 일은 홈에서 진행하세요.",
    envelope: "기간 요약",
    status: "상태",
    theme: "주제",
    mixCaps: "비율 한도",
    constraint: "제약 안내",
    notLoaded: "아직 불러오지 못했습니다.",
    chain: "목표 → 지표 → 할 일",
    goal: "목표",
    kpis: "지표",
    missions: "할 일",
    noGoals: "이 기간에 목표가 없습니다. 홈에서 오늘 할 일부터 진행하세요.",
    realloc: "조정 제안",
    noRealloc: "제안이 없습니다.",
    fact: "확정",
    explain: "설명",
  },

  wizard: {
    open: "처음 연결 도우미",
    title: "처음 연결 도우미",
    finish: "홈으로",
    connectWithPassword: "아이디·비밀번호로 연결",
  },

  common: {
    error: "오류",
    errorTrace: "오류 / 추적 번호",
  },

  notices: {
    starting: "작업을 대기줄에 넣는 중…",
    started: (jobId: string) =>
      `대기줄에 등록했습니다. 작업 번호: ${jobId} — 진행은 알림함에서 보세요.`,
    startedStub: (jobId: string) => `대기줄에 등록했습니다. 작업 번호: ${jobId}`,
    reviewOn: "글 확인 모드입니다. 내용을 살펴보세요.",
    reviewOff: "글 확인 모드를 껐습니다.",
    blockedPublish: "지금은 올릴 수 없습니다. 「지금 상황」과 알림함을 확인하세요.",
    needApi: "자동으로 올리려면 계정 연결이 필요합니다.",
    needAccount: "먼저 「계정 연결」에서 계정을 연결하세요.",
    publishOk: (mode: string) => `올리기 성공 (${mode})`,
    publishQueued: (jobId: string) => `올리기 요청을 받았습니다. 작업 번호: ${jobId}`,
    challenge: "본인 확인이 필요해 올리기를 멈췄습니다. 알림함을 확인하세요.",
    publishDenied: "올리기가 거부되었습니다. 계정·권한을 확인하세요.",
    exportDone: "파일로 보관했습니다. (홍보 완료가 아니라 백업입니다.)",
    resumeNeedAccount: "다시 올리려면 계정 연결이 필요합니다.",
    resumed: "올리기를 다시 시작합니다. 상황을 갱신합니다.",
  },
} as const;

export function labelWorkState(status: keyof typeof COPY.workState | string): string {
  const map = COPY.workState as Record<string, string>;
  return map[status] ?? status;
}

export function labelPublishMode(mode: "api" | "session" | string): string {
  if (mode === "api") return COPY.publishMode.api;
  if (mode === "session") return COPY.publishMode.session;
  return mode;
}

export function labelRisk(level: "low" | "medium" | "high" | string): string {
  const map = COPY.risk as Record<string, string>;
  return map[level] ?? level;
}

const PLATFORM_KO: Record<string, string> = {
  naver: "네이버 블로그",
  instagram: "인스타그램",
  x: "X (트위터)",
  threads: "스레드",
  youtube: "유튜브",
  facebook: "페이스북",
};

export function labelPlatform(platform: string): string {
  return PLATFORM_KO[platform] ?? platform;
}
