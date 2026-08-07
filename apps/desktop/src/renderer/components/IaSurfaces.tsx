import React, { useCallback, useEffect, useState } from "react";
import { Badge, Button, DataRow, Panel, Toolbar } from "@clime/ui";
import { COPY, labelPlatform } from "../uiCopy.js";

/** V1 IA residual surfaces (15 §2) — Domain API only; secondary drawers. */
export type IaSurfaceId =
  | "projects"
  | "account"
  | "tools"
  | "content"
  | "templates"
  | "queue"
  | "analytics"
  | "export";

export type IaSurfacesProps = {
  surface: IaSurfaceId | null;
  onSurfaceChange?: (next: IaSurfaceId) => void;
  onClose: () => void;
  projectId?: string;
  onOpenWizard?: () => void;
  onOpenHistory?: () => void;
};

const SURFACE_ORDER: IaSurfaceId[] = [
  "projects",
  "account",
  "tools",
  "content",
  "templates",
  "queue",
  "analytics",
  "export",
];

const TITLES: Record<IaSurfaceId, string> = {
  projects: COPY.surfaces.projects,
  account: COPY.surfaces.account,
  tools: COPY.surfaces.tools,
  content: COPY.surfaces.content,
  templates: COPY.surfaces.templates,
  queue: COPY.surfaces.queue,
  analytics: COPY.surfaces.analytics,
  export: COPY.surfaces.export,
};

const SURFACE_ATTR: Record<IaSurfaceId, string> = {
  projects: "Projects",
  account: "AccountManager",
  tools: "ToolsBrowserProfiles",
  content: "Content",
  templates: "MissionTemplates",
  queue: "QueueCalendarKeywords",
  analytics: "Analytics",
  export: "ExportBackup",
};

const DEFAULT_PROJECT = "seed_project_empty";

function asRows(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * Lean IA surface drawer — closes V1 checklist gaps without vanity KPI collage.
 */
export function IaSurfaces({
  surface,
  onSurfaceChange,
  onClose,
  projectId = DEFAULT_PROJECT,
  onOpenWizard,
  onOpenHistory,
}: IaSurfacesProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown>>({});

  const refresh = useCallback(async () => {
    if (!surface || typeof window === "undefined" || !window.domainClient) return;
    setBusy(true);
    setError(null);
    try {
      const dc = window.domainClient;
      switch (surface) {
        case "projects": {
          const project = await dc.settings.getProject({ projectId });
          const mission = await dc.growth.getMissionToday({});
          setPayload({ projectId, project, mission });
          break;
        }
        case "account": {
          const accounts = await dc.account.listAccounts({});
          const matrix = await dc.account.getMatrix({});
          const wizard = await dc.account.wizardProgress({});
          setPayload({ accounts, matrix, wizard, projectId });
          break;
        }
        case "tools": {
          const profiles = await dc.tool.listProfiles({});
          setPayload({
            profiles,
            note: "브라우저 프로필·파일 선택·글자 인식(OCR) 도구입니다. 사이트 제한을 자동으로 넘기는 기능은 없습니다.",
          });
          break;
        }
        case "content": {
          const history = await dc.content.listHistory({ projectId, limit: 20 });
          setPayload({
            history,
            note: "글 만들기 → 검사 → 다듬기. 「올린 기록」과 함께 보세요.",
          });
          break;
        }
        case "templates": {
          const templates = await dc.workflow.listTemplates({});
          const runs = await dc.workflow.listRuns({});
          setPayload({ templates, runs });
          break;
        }
        case "queue": {
          const queue = await dc.automation.listQueue({});
          const depth = await dc.automation.getQueueDepth({});
          const workers = await dc.automation.getWorkerStatus({});
          const keywords = await dc.growth.getKeywordGraph({ projectId });
          setPayload({
            queue,
            depth,
            workers,
            keywords,
            calendarNote: "일정은 「오늘 홍보 시작」으로 대기줄에 넣는 방식으로 운영합니다.",
          });
          break;
        }
        case "analytics": {
          const funnel = await dc.analytics.getFunnel({});
          const roi = await dc.analytics.getRoi({});
          const experiments = await dc.analytics.listExperiments({});
          setPayload({
            funnel,
            roi,
            experiments,
            estimateLabel: "추정 — 예측 숫자는 참고용입니다.",
          });
          break;
        }
        case "export": {
          const history = await dc.content.listHistory({ projectId, limit: 10 });
          setPayload({
            history,
            note: "파일로 보관은 백업입니다. 홍보(올리기) 완료와는 다릅니다.",
          });
          break;
        }
        default:
          break;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [surface, projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runSandbox = async () => {
    if (!window.domainClient?.account) return;
    const accounts = (payload.accounts as Array<{ id: string; platform?: string }>) ?? [];
    const first = accounts[0];
    if (!first) {
      setError("연결된 계정이 없습니다. 「처음 연결 도우미」에서 연결하세요.");
      return;
    }
    setBusy(true);
    try {
      const result = await window.domainClient.account.sandboxTest({
        platform: first.platform ?? "unknown",
      });
      setPayload((p) => ({ ...p, sandboxResult: result }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const runExportBackup = async () => {
    if (!window.domainClient?.content?.exportPack) return;
    setBusy(true);
    try {
      const history = (payload.history as Array<{ contentItemId?: string; id?: string }>) ?? [];
      const itemIds = history
        .map((h) => h.contentItemId ?? h.id)
        .filter((id): id is string => typeof id === "string");
      if (itemIds.length === 0) {
        setError("보관할 글이 없습니다. 글을 만든 뒤 다시 시도하세요. (보관≠홍보 완료)");
        return;
      }
      const result = await window.domainClient.content.exportPack({ itemIds });
      setPayload((p) => ({ ...p, lastExport: result }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const pickProfileProbe = async () => {
    if (!window.domainClient?.tool) return;
    setBusy(true);
    try {
      const file = await window.domainClient.tool.pickFile({});
      const path =
        file && typeof file === "object" && "filePath" in file && typeof file.filePath === "string"
          ? file.filePath
          : "C:/tmp/clime-ocr-probe.png";
      const ocr = await window.domainClient.tool.runOcr({ filePath: path });
      setPayload((p) => ({ ...p, pickFile: file, ocrJob: ocr }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (!surface) return null;

  return (
    <div
      className="clime-ia-surfaces"
      data-clime-surface={SURFACE_ATTR[surface]}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 870,
        display: "flex",
        justifyContent: "flex-end",
        background: "color-mix(in srgb, var(--clime-fg) 24%, transparent)",
        animation: "clime-enter var(--clime-motion-enter) var(--clime-ease-out)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        role="dialog"
        aria-label={TITLES[surface]}
        style={{
          width: "min(560px, 100vw)",
          height: "100%",
          background: "var(--clime-bg)",
          borderLeft: "1px solid var(--clime-border)",
          color: "var(--clime-fg)",
          fontFamily: "var(--clime-font-sans)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Toolbar>
          <strong style={{ flex: 1, fontSize: "var(--clime-text-title)" }}>
            {TITLES[surface]}
          </strong>
          <Button variant="ghost" onClick={() => void refresh()} disabled={busy}>
            다시 불러오기
          </Button>
          <Button variant="ghost" onClick={onClose}>
            닫기
          </Button>
        </Toolbar>

        {onSurfaceChange ? (
          <div
            className="flex flex-wrap gap-1"
            style={{
              padding: "var(--clime-space-2) var(--clime-space-3)",
              borderBottom: "1px solid var(--clime-border)",
            }}
          >
            {SURFACE_ORDER.map((id) => (
              <Button
                key={id}
                variant={id === surface ? "secondary" : "ghost"}
                onClick={() => onSurfaceChange(id)}
              >
                {TITLES[id]}
              </Button>
            ))}
          </div>
        ) : null}

        <div
          style={{
            padding: "var(--clime-space-3)",
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "var(--clime-space-3)",
          }}
        >
          {error ? (
            <Panel>
              <DataRow label={COPY.common.errorTrace} value={error} />
            </Panel>
          ) : null}

          {surface === "account" ? (
            <div className="flex flex-col gap-2">
              <p
                style={{
                  margin: 0,
                  fontSize: "var(--clime-text-caption)",
                  color: "var(--clime-fg-muted)",
                }}
              >
                SNS 아이디·비밀번호는 「처음 연결 도우미」에서 입력합니다. 비밀번호는 금고에만
                저장됩니다.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={onOpenWizard}>
                  처음 연결 도우미 (아이디·비밀번호)
                </Button>
                <Button variant="ghost" onClick={() => void runSandbox()} disabled={busy}>
                  안전 점검 (실제 올리기 없음)
                </Button>
              </div>
            </div>
          ) : null}

          {surface === "content" ? (
            <Button variant="secondary" onClick={onOpenHistory}>
              올린 기록 보기
            </Button>
          ) : null}

          {surface === "tools" ? (
            <Button variant="secondary" onClick={() => void pickProfileProbe()} disabled={busy}>
              파일 선택·글자 인식 시험
            </Button>
          ) : null}

          {surface === "export" ? (
            <div className="flex flex-col gap-2">
              <Badge tone="neutral">파일 보관 = 백업 (홍보 완료 아님)</Badge>
              <Button variant="secondary" onClick={() => void runExportBackup()} disabled={busy}>
                지금 파일로 보관
              </Button>
            </div>
          ) : null}

          {surface === "analytics" ? (
            <Badge tone="warning">추정 숫자 — 참고용입니다</Badge>
          ) : null}

          {surface === "queue" ? (
            <Badge tone="info">「오늘 홍보 시작」→ 대기줄에만 등록</Badge>
          ) : null}

          {surface === "account" ? (
            <Panel elevated>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--clime-space-3)" }}>
                <strong style={{ fontSize: "var(--clime-text-ui)" }}>
                  {COPY.status.accountsTitle}
                </strong>
                {busy ? (
                  <p style={{ margin: 0, color: "var(--clime-fg-muted)" }}>불러오는 중…</p>
                ) : Array.isArray(payload.accounts) && payload.accounts.length > 0 ? (
                  (payload.accounts as Array<{
                    id: string;
                    platform?: string;
                    accountName?: string;
                    credentialRef?: string;
                  }>).map((acc) => (
                    <div
                      key={acc.id}
                      style={{
                        borderTop: "1px solid var(--clime-border)",
                        paddingTop: "var(--clime-space-2)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--clime-space-1)",
                      }}
                    >
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--clime-space-2)" }}>
                        <Badge tone="success">{COPY.status.accountsConnected}</Badge>
                        {acc.credentialRef ? (
                          <Badge tone="neutral">{COPY.status.accountsLoginSaved}</Badge>
                        ) : null}
                      </div>
                      <DataRow
                        label="플랫폼"
                        value={labelPlatform(acc.platform ?? "unknown")}
                      />
                      <DataRow label="아이디" value={acc.accountName ?? "—"} />
                    </div>
                  ))
                ) : (
                  <p
                    style={{
                      margin: 0,
                      fontSize: "var(--clime-text-ui)",
                      color: "var(--clime-fg-muted)",
                    }}
                  >
                    {COPY.status.accountsEmpty}
                  </p>
                )}
                {payload.matrix && typeof payload.matrix === "object" ? (
                  <DataRow
                    label="지금 올리기"
                    value={
                      (payload.matrix as { canPublish?: boolean }).canPublish
                        ? COPY.status.canPublishYes
                        : COPY.status.canPublishNo
                    }
                  />
                ) : null}
              </div>
            </Panel>
          ) : (
            <Panel elevated>
              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontFamily: "var(--clime-font-mono)",
                  fontSize: "var(--clime-text-mono)",
                  color: "var(--clime-fg)",
                }}
              >
                {busy ? "로딩…" : asRows(payload)}
              </pre>
            </Panel>
          )}
        </div>
      </aside>
    </div>
  );
}
