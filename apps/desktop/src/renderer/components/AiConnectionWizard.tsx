import React, { useEffect, useState } from "react";
import { Button, DataRow, Panel } from "@clime/ui";
import { COPY } from "../uiCopy.js";

const PLATFORMS = [
  { id: "naver", label: "네이버 블로그", allowsPassword: true },
  { id: "instagram", label: "인스타그램", allowsPassword: true },
  { id: "x", label: "X (트위터)", allowsPassword: true },
  { id: "threads", label: "스레드", allowsPassword: true },
  { id: "youtube", label: "유튜브", allowsPassword: false },
  { id: "facebook", label: "페이스북", allowsPassword: false },
] as const;

const WIZARD_STEPS = [
  { id: "platform_select", title: "플랫폼 선택", body: "연결할 SNS·블로그를 고르세요." },
  {
    id: "connect",
    title: "계정 연결",
    body: "아이디와 비밀번호를 입력하면 금고에만 저장하고 계정을 연결합니다. (화면에 남겨 두지 않습니다.)",
  },
  { id: "profile_import", title: "프로필 가져오기", body: "공개된 프로필 정보를 가져옵니다." },
  { id: "brand_draft", title: "브랜드 초안", body: "말투와 지켜야 할 규칙을 초안으로 잡습니다." },
  {
    id: "tips",
    title: "첫 홍보 팁",
    body: "홈에서 「오늘 홍보 시작」을 누르면 됩니다.",
  },
] as const;

export type AiConnectionWizardProps = {
  open: boolean;
  onClose: () => void;
  onFinished: () => void;
};

type WizardProgress = {
  step: string;
  completed: boolean;
  updatedAt?: string;
};

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: "var(--clime-space-1)",
  background: "var(--clime-bg-elevated)",
  border: "1px solid var(--clime-border)",
  color: "var(--clime-fg)",
  fontFamily: "var(--clime-font-sans)",
  fontSize: "var(--clime-text-ui)",
  padding: "var(--clime-space-2)",
  boxSizing: "border-box",
};

/**
 * First-run AI Connection Wizard — skippable & resumable via account.wizardProgress.
 * Connect step: username + password → domain:account.connect (vaulted in main).
 */
export function AiConnectionWizard({ open, onClose, onFinished }: AiConnectionWizardProps) {
  const [progress, setProgress] = useState<WizardProgress>({
    step: "platform_select",
    completed: false,
  });
  const [busy, setBusy] = useState(false);
  const [platform, setPlatform] = useState<string>("naver");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connectedName, setConnectedName] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined" || !window.domainClient?.account?.wizardProgress) return;
    void window.domainClient.account
      .wizardProgress({})
      .then((res) => {
        if (res?.step) {
          setProgress({
            step: String(res.step),
            completed: Boolean(res.completed),
            updatedAt: res.updatedAt,
          });
        }
      })
      .catch(() => {
        /* keep defaults */
      });
  }, [open]);

  if (!open) return null;

  const stepIndex = Math.max(
    0,
    WIZARD_STEPS.findIndex((s) => s.id === progress.step),
  );
  const current = WIZARD_STEPS[stepIndex] ?? WIZARD_STEPS[0]!;
  const selected = PLATFORMS.find((p) => p.id === platform) ?? PLATFORMS[0]!;

  const persist = async (step: string, completed: boolean) => {
    setBusy(true);
    try {
      if (window.domainClient?.account?.wizardProgress) {
        const next = await window.domainClient.account.wizardProgress({
          step,
          completed,
        });
        setProgress({
          step: String(next.step),
          completed: Boolean(next.completed),
          updatedAt: next.updatedAt,
        });
      } else {
        setProgress({ step, completed, updatedAt: new Date().toISOString() });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleConnect = async () => {
    setError(null);
    if (!selected.allowsPassword) {
      setError(
        "이 플랫폼은 공식 연결이 필요합니다. 지금은 네이버·인스타·X·스레드에 아이디/비밀번호로 연결하세요.",
      );
      return;
    }
    if (!username.trim() || !password) {
      setError("아이디와 비밀번호를 모두 입력하세요.");
      return;
    }
    if (!window.domainClient?.account?.connect) {
      setError("계정 연결 기능을 사용할 수 없습니다. 앱을 다시 실행해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const res = await window.domainClient.account.connect({
        projectId: "seed_project_empty",
        platform,
        accountName: username.trim(),
        username: username.trim(),
        password,
        authMode: "session",
      });
      setPassword("");
      setConnectedName(
        (res && typeof res === "object" && "accountName" in res
          ? String((res as { accountName?: string }).accountName)
          : null) || username.trim(),
      );
      await persist("profile_import", false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleNext = async () => {
    setError(null);
    if (current.id === "platform_select") {
      await persist("connect", false);
      return;
    }
    if (current.id === "connect") {
      if (!connectedName) {
        await handleConnect();
        return;
      }
      await persist("profile_import", false);
      return;
    }
    if (stepIndex >= WIZARD_STEPS.length - 1) {
      await persist("tips", true);
      onFinished();
      return;
    }
    const nextStep = WIZARD_STEPS[stepIndex + 1]!;
    await persist(nextStep.id, false);
  };

  const handleSkip = async () => {
    await persist("skipped", true);
    onFinished();
  };

  return (
    <div
      className="clime-ai-connection-wizard"
      data-clime-surface="AiConnectionWizard"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 950,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "color-mix(in srgb, var(--clime-fg) 32%, transparent)",
        padding: "var(--clime-space-4)",
        animation: "clime-enter var(--clime-motion-enter) var(--clime-ease-out)",
      }}
    >
      <Panel
        elevated
        style={{
          width: "min(520px, 100%)",
          padding: "var(--clime-space-4)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--clime-space-4)",
        }}
      >
        <header>
          <h2 style={{ margin: 0, fontSize: "var(--clime-text-title)" }}>{COPY.wizard.title}</h2>
          <p
            style={{
              margin: "var(--clime-space-2) 0 0",
              color: "var(--clime-fg-muted)",
              fontSize: "var(--clime-text-caption)",
            }}
          >
            CLIME AI Growth Studio 첫 연결 — 건너뛰기·이어서 하기 가능
          </p>
        </header>

        <DataRow label="단계" value={`${stepIndex + 1} / ${WIZARD_STEPS.length}`} />
        <div>
          <h3 style={{ margin: 0, fontSize: "var(--clime-text-ui)" }}>{current.title}</h3>
          <p
            style={{
              margin: "var(--clime-space-2) 0 0",
              fontSize: "var(--clime-text-body)",
              color: "var(--clime-fg-muted)",
            }}
          >
            {current.body}
          </p>
        </div>

        {current.id === "platform_select" ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--clime-space-2)" }}>
            {PLATFORMS.map((p) => (
              <Button
                key={p.id}
                variant={platform === p.id ? "primary" : "secondary"}
                onClick={() => {
                  setPlatform(p.id);
                  setConnectedName(null);
                  setError(null);
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
        ) : null}

        {current.id === "connect" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--clime-space-3)" }}>
            <DataRow label="선택한 플랫폼" value={selected.label} />
            {selected.allowsPassword ? (
              <>
                <label style={{ fontSize: "var(--clime-text-caption)" }}>
                  아이디 (또는 이메일)
                  <input
                    aria-label="sns-username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={inputStyle}
                    placeholder="예: myblog@naver.com"
                  />
                </label>
                <label style={{ fontSize: "var(--clime-text-caption)" }}>
                  비밀번호
                  <input
                    aria-label="sns-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={inputStyle}
                    placeholder="비밀번호"
                  />
                </label>
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--clime-text-caption)",
                    color: "var(--clime-fg-muted)",
                  }}
                >
                  비밀번호는 금고에만 암호화해 두고, 메모장·채팅에 붙여넣지 마세요.
                </p>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: "var(--clime-text-ui)", color: "var(--clime-warning)" }}>
                유튜브·페이스북은 아이디/비밀번호 직접 입력이 아니라 공식 연결이 필요합니다. 다른
                플랫폼을 고르거나 건너뛰세요.
              </p>
            )}
            {connectedName ? (
              <p style={{ margin: 0, fontSize: "var(--clime-text-ui)", color: "var(--clime-success)" }}>
                연결됨: {connectedName}
              </p>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p style={{ margin: 0, color: "var(--clime-danger)", fontSize: "var(--clime-text-ui)" }}>
            {error}
          </p>
        ) : null}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--clime-space-2)" }}>
          {current.id === "connect" && selected.allowsPassword && !connectedName ? (
            <Button variant="primary" disabled={busy} onClick={() => void handleConnect()}>
              아이디·비밀번호로 연결
            </Button>
          ) : (
            <Button variant="primary" disabled={busy} onClick={() => void handleNext()}>
              {stepIndex >= WIZARD_STEPS.length - 1 ? COPY.wizard.finish : "다음"}
            </Button>
          )}
          {current.id === "connect" && connectedName ? (
            <Button variant="secondary" disabled={busy} onClick={() => void handleNext()}>
              다음
            </Button>
          ) : null}
          <Button variant="secondary" disabled={busy} onClick={() => void handleSkip()}>
            건너뛰기
          </Button>
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            나중에 이어서
          </Button>
        </div>
      </Panel>
    </div>
  );
}
