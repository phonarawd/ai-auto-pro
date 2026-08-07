import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, CommandPalette, DataRow, Panel } from "@clime/ui";
import { AiConnectionWizard } from "./AiConnectionWizard.js";
import { AiInbox, type InboxItemView } from "./AiInbox.js";
import { ChallengePauseBanner } from "./ChallengePauseBanner.js";
import { ExecutiveDashboard } from "./ExecutiveDashboard.js";
import { IaSurfaces, type IaSurfaceId } from "./IaSurfaces.js";
import { KnowledgeBrowser } from "./KnowledgeBrowser.js";
import { PublishingHistoryPanel } from "./PublishingHistoryPanel.js";
import { SettingsPanel } from "./SettingsPanel.js";
import {
  COPY,
  labelPlatform,
  labelPublishMode,
  labelRisk,
  labelWorkState,
} from "../uiCopy.js";

export type ConnectedAccountView = {
  id: string;
  platform: string;
  accountName: string;
  credentialRef?: string;
  authMode?: string;
};

export type MissionData = {
  id: string;
  title: string;
  description: string;
  summary: string;
  status: "QUEUED" | "RUNNING" | "VALIDATING" | "OPTIMIZING" | "READY" | "PUBLISHED" | "PAUSED_CHALLENGE";
};

export type CapabilityMatrixData = {
  canPublish: boolean;
  publishMode: "api" | "session";
  riskLevel: "low" | "medium" | "high";
  platforms: Array<{
    id: string;
    name: string;
    canPublish: boolean;
    publishMode: "api" | "session";
  }>;
};

export function MissionCenterFrame() {
  const [mission, setMission] = useState<MissionData>({
    id: "mission-today-stub",
    title: "AI 트렌드 멀티잭 및 7채널 오가닉 리퍼포징",
    description: "오늘의 우선순위 키워드와 연관 핫토픽을 기반으로 멀티채널 포스트를 생성하고 검증합니다.",
    summary: "Decision Engine: 오늘 성장에 가장 효과적인 멀티채널 가시성 확보 미션",
    status: "READY",
  });

  const [capabilities, setCapabilities] = useState<CapabilityMatrixData>({
    canPublish: true,
    publishMode: "api",
    riskLevel: "low",
    platforms: [
      { id: "x", name: "X (Twitter)", canPublish: true, publishMode: "api" },
      { id: "threads", name: "Threads", canPublish: true, publishMode: "session" },
    ],
  });

  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const [traceId, setTraceId] = useState<string | null>("tr-init-0001");
  const [reviewMode, setReviewMode] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [inboxOpen, setInboxOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [executiveOpen, setExecutiveOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [iaSurface, setIaSurface] = useState<IaSurfaceId | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickQuery, setQuickQuery] = useState("");
  const [challengePause, setChallengePause] = useState<{
    active: boolean;
    platform?: string;
    traceId?: string;
    accountId?: string;
  }>({ active: false });
  const [unreadInbox, setUnreadInbox] = useState(0);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccountView[]>([]);

  const refreshAccounts = useCallback(async () => {
    if (typeof window === "undefined" || !window.domainClient?.account?.listAccounts) return;
    try {
      const list = (await window.domainClient.account.listAccounts({})) as ConnectedAccountView[];
      setConnectedAccounts(Array.isArray(list) ? list : []);
    } catch {
      /* keep previous */
    }
  }, []);

  const refreshMatrix = useCallback(async () => {
    if (typeof window === "undefined" || !window.domainClient?.account?.getMatrix) return;
    try {
      const matrix = (await window.domainClient.account.getMatrix({})) as {
        canPublish?: boolean;
        publishMode?: "api" | "session";
        riskLevel?: "low" | "medium" | "high";
        platforms?: CapabilityMatrixData["platforms"];
      };
      if (matrix && typeof matrix.canPublish === "boolean") {
        setCapabilities({
          canPublish: matrix.canPublish,
          publishMode: matrix.publishMode ?? "api",
          riskLevel: matrix.riskLevel ?? "high",
          platforms: matrix.platforms ?? capabilities.platforms,
        });
      }
    } catch {
      /* keep stub */
    }
  }, [capabilities.platforms]);

  const refreshInboxBadge = useCallback(async () => {
    if (typeof window === "undefined" || !window.domainClient?.notification?.listInbox) return;
    try {
      const list = (await window.domainClient.notification.listInbox({})) as InboxItemView[];
      const items = Array.isArray(list) ? list : [];
      setUnreadInbox(items.filter((i) => !i.read).length);
      const paused = items.find((i) => i.terminalState === "PAUSED_CHALLENGE");
      if (paused) {
        setChallengePause({
          active: true,
          platform: paused.platform,
          traceId: paused.traceId,
          accountId: paused.accountId,
        });
        setMission((prev) => ({ ...prev, status: "PAUSED_CHALLENGE" }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.domainClient) {
      const applyMissionToday = (res: unknown) => {
        const resObj = res as {
          missions?: Array<{
            id?: string;
            title?: string;
            description?: string;
            summary?: string;
            status?: string;
          }>;
          decisionExplain?: string;
          estimateLabel?: string;
        };
        const firstMission = resObj?.missions?.[0];
        const why =
          resObj?.decisionExplain ??
          firstMission?.summary ??
          mission.summary;
        const whyLabeled =
          resObj?.estimateLabel === "추정" && why && !why.includes("추정")
            ? `${why} (추정)`
            : why;
        if (firstMission?.id) {
          setMission({
            id: firstMission.id,
            title: firstMission.title ?? mission.title,
            description: firstMission.description ?? mission.description,
            summary: whyLabeled,
            status: (firstMission.status as MissionData["status"]) ?? mission.status,
          });
        } else if (whyLabeled) {
          setMission((prev) => ({ ...prev, summary: whyLabeled }));
        }
      };

      const loadToday = async () => {
        const growth = window.domainClient?.growth;
        if (!growth?.getMissionToday) return;
        try {
          let res = await growth.getMissionToday({});
          const resObj = res as { missions?: unknown[] };
          if ((!resObj.missions || resObj.missions.length === 0) && growth.runDailyDecision) {
            await growth.runDailyDecision({});
            res = await growth.getMissionToday({});
          }
          applyMissionToday(res);
        } catch {
          /* Keep stub fallback on error */
        }
      };
      void loadToday();

      void refreshMatrix();
      void refreshAccounts();
      void refreshInboxBadge();

      window.domainClient.account
        ?.wizardProgress?.({})
        .then((res) => {
          const p = res as { completed?: boolean };
          if (p && p.completed === false) {
            setWizardOpen(true);
          }
        })
        .catch(() => {
          /* no wizard force-open on error */
        });
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.domainClient?.notification?.subscribePush) {
      return;
    }
    return window.domainClient.notification.subscribePush((item) => {
      const view = item as InboxItemView;
      setUnreadInbox((n) => n + (view.read ? 0 : 1));
      if (view.kind === "challenge.pause" || view.terminalState === "PAUSED_CHALLENGE") {
        setChallengePause({
          active: true,
          platform: view.platform,
          traceId: view.traceId,
          accountId: view.accountId,
        });
        setMission((prev) => ({ ...prev, status: "PAUSED_CHALLENGE" }));
        setNotice(COPY.notices.challenge);
        setInboxOpen(true);
      }
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuickOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** START → Planner Queue only (operator copy is Korean; Queue bypass = 0). */
  const handleStartMission = async () => {
    setNotice(COPY.notices.starting);
    if (typeof window !== "undefined" && window.domainClient?.automation?.startMission) {
      try {
        const result = (await window.domainClient.automation.startMission({
          missionId: mission.id,
        })) as { jobId: string; traceId?: string };
        setLastJobId(result.jobId);
        setTraceId(result.traceId ?? `tr-${Date.now()}`);
        setMission((prev: MissionData) => ({ ...prev, status: "RUNNING" }));
        setNotice(COPY.notices.started(result.jobId));
        void refreshInboxBadge();
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setNotice(`오류: ${errorMsg}`);
      }
    } else {
      const stubJobId = `job-stub-${Math.random().toString(36).substring(2, 8)}`;
      setLastJobId(stubJobId);
      setTraceId(`tr-${Date.now()}`);
      setMission((prev: MissionData) => ({ ...prev, status: "RUNNING" }));
      setNotice(COPY.notices.startedStub(stubJobId));
    }
  };

  const handleReviewContent = () => {
    setReviewMode(!reviewMode);
    setNotice(reviewMode ? COPY.notices.reviewOff : COPY.notices.reviewOn);
  };

  const handleAutoPublish = async () => {
    if (!capabilities.canPublish || challengePause.active) {
      setNotice(COPY.notices.blockedPublish);
      setInboxOpen(true);
      return;
    }
    if (!window.domainClient?.account?.publish) {
      setNotice(COPY.notices.needApi);
      return;
    }
    try {
      const accounts = (await window.domainClient.account.listAccounts({})) as Array<{
        id?: string;
        platform?: string;
      }>;
      const accountId = accounts[0]?.id;
      if (!accountId) {
        setNotice(COPY.notices.needAccount);
        setWizardOpen(true);
        return;
      }
      const publishTrace = `tr-pub-${Date.now().toString(36)}`;
      setTraceId(publishTrace);
      const result = (await window.domainClient.account.publish(
        {
          contentItemId: "mission-ready-artifact",
          accountId,
          platform: accounts[0]?.platform,
          skipJitter: true,
        },
        { traceId: publishTrace },
      )) as {
        ok?: boolean;
        publishMode?: string;
        historyKind?: string;
        code?: string;
        message?: string;
        terminal?: string;
        jobId?: string;
      };
      if (result.jobId) setLastJobId(result.jobId);
      if (result.ok) {
        setMission((prev) => ({ ...prev, status: "PUBLISHED" }));
        setNotice(
          COPY.notices.publishOk(
            labelPublishMode(result.publishMode ?? capabilities.publishMode),
          ),
        );
        void refreshMatrix();
        return;
      }
      if (result.jobId && result.ok === undefined && !result.code) {
        setNotice(COPY.notices.publishQueued(result.jobId));
        return;
      }
      if (result.code === "PAUSED_CHALLENGE" || result.terminal === "PAUSED_CHALLENGE") {
        setMission((prev) => ({ ...prev, status: "PAUSED_CHALLENGE" }));
        setChallengePause({ active: true, accountId, traceId: publishTrace });
        setNotice(COPY.notices.challenge);
        setInboxOpen(true);
        void refreshInboxBadge();
        void refreshMatrix();
        return;
      }
      setNotice(result.message ?? COPY.notices.publishDenied);
      if (result.code === "BLOCKED_CAPABILITY") setInboxOpen(true);
      void refreshMatrix();
    } catch (err: unknown) {
      setNotice(`올리기 오류: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleExportBackup = () => {
    setNotice(COPY.notices.exportDone);
  };

  const handleResumePublish = async (accountId?: string) => {
    const id = accountId ?? challengePause.accountId;
    if (!id || !window.domainClient?.account?.resumePublish) {
      setNotice(COPY.notices.resumeNeedAccount);
      return;
    }
    try {
      await window.domainClient.account.resumePublish({ accountId: id });
      setChallengePause({ active: false });
      setMission((prev) => ({ ...prev, status: "READY" }));
      setNotice(COPY.notices.resumed);
      void refreshMatrix();
      void refreshInboxBadge();
    } catch (err: unknown) {
      setNotice(`다시 올리기 오류: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const quickItems = useMemo(() => {
    const all = [
      {
        id: "start",
        label: COPY.cta.start,
        hint: "Ctrl+Enter",
        onSelect: () => {
          setQuickOpen(false);
          void handleStartMission();
        },
      },
      {
        id: "inbox",
        label: COPY.nav.inbox,
        hint: "진행·확인 필요",
        onSelect: () => {
          setQuickOpen(false);
          setInboxOpen(true);
        },
      },
      {
        id: "executive",
        label: COPY.nav.executive,
        hint: "주·월·분기",
        onSelect: () => {
          setQuickOpen(false);
          setExecutiveOpen(true);
        },
      },
      {
        id: "settings",
        label: COPY.nav.settings,
        onSelect: () => {
          setQuickOpen(false);
          setSettingsOpen(true);
        },
      },
      {
        id: "knowledge",
        label: COPY.nav.knowledge,
        onSelect: () => {
          setQuickOpen(false);
          setKnowledgeOpen(true);
        },
      },
      {
        id: "wizard",
        label: COPY.wizard.open,
        hint: "건너뛰기 가능",
        onSelect: () => {
          setQuickOpen(false);
          setWizardOpen(true);
        },
      },
      {
        id: "review",
        label: COPY.cta.review,
        onSelect: () => {
          setQuickOpen(false);
          handleReviewContent();
        },
      },
      {
        id: "export",
        label: COPY.cta.export,
        hint: "백업 (홍보 완료 아님)",
        onSelect: () => {
          setQuickOpen(false);
          handleExportBackup();
        },
      },
      {
        id: "projects",
        label: COPY.surfaces.projects,
        onSelect: () => {
          setQuickOpen(false);
          setIaSurface("projects");
        },
      },
      {
        id: "account",
        label: COPY.surfaces.account,
        hint: "연결·가능 여부",
        onSelect: () => {
          setQuickOpen(false);
          setIaSurface("account");
        },
      },
      {
        id: "tools",
        label: COPY.surfaces.tools,
        onSelect: () => {
          setQuickOpen(false);
          setIaSurface("tools");
        },
      },
      {
        id: "content",
        label: COPY.surfaces.content,
        onSelect: () => {
          setQuickOpen(false);
          setIaSurface("content");
        },
      },
      {
        id: "templates",
        label: COPY.surfaces.templates,
        onSelect: () => {
          setQuickOpen(false);
          setIaSurface("templates");
        },
      },
      {
        id: "queue",
        label: COPY.surfaces.queue,
        onSelect: () => {
          setQuickOpen(false);
          setIaSurface("queue");
        },
      },
      {
        id: "analytics",
        label: COPY.surfaces.analytics,
        hint: "추정 포함",
        onSelect: () => {
          setQuickOpen(false);
          setIaSurface("analytics");
        },
      },
      {
        id: "export-surface",
        label: COPY.surfaces.export,
        onSelect: () => {
          setQuickOpen(false);
          setIaSurface("export");
        },
      },
    ];
    const q = quickQuery.trim().toLowerCase();
    if (!q) return all;
    return all.filter((i) => i.label.toLowerCase().includes(q) || i.id.includes(q));
  }, [quickQuery, mission.id, reviewMode, challengePause.active]);

  return (
    <div
      className="clime-mission-center flex flex-col gap-6 p-6 max-w-5xl mx-auto min-h-screen"
      style={{
        backgroundColor: "var(--clime-bg)",
        color: "var(--clime-fg)",
        fontFamily: "var(--clime-font-sans)",
      }}
    >
      {/* Zone A — Brand */}
      <header className="flex flex-col gap-1 border-b border-(--clime-border) pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1
              className="font-semibold text-2xl tracking-tight"
              style={{
                fontSize: "var(--clime-text-display)",
                color: "var(--clime-fg)",
              }}
            >
              CLIME AI Growth Studio
            </h1>
            <p
              className="text-xs"
              style={{
                color: "var(--clime-fg-muted)",
                fontSize: "var(--clime-text-caption)",
              }}
            >
              {COPY.brandSubtitle}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button variant="ghost" onClick={() => setQuickOpen(true)}>
              {COPY.nav.quick}
            </Button>
            <Button variant="ghost" onClick={() => setExecutiveOpen(true)}>
              {COPY.nav.executive}
            </Button>
            <Button variant="ghost" onClick={() => setSettingsOpen(true)}>
              {COPY.nav.settings}
            </Button>
            <Button variant="ghost" onClick={() => setKnowledgeOpen(true)}>
              {COPY.nav.knowledge}
            </Button>
            <Button variant="ghost" onClick={() => setHistoryOpen(true)}>
              {COPY.nav.history}
            </Button>
            <Button variant="ghost" onClick={() => setIaSurface("projects")}>
              {COPY.nav.menu}
            </Button>
            <Button variant="secondary" onClick={() => setInboxOpen(true)}>
              {COPY.nav.inbox}
              {unreadInbox > 0 ? ` (${unreadInbox})` : ""}
            </Button>
          </div>
        </div>
      </header>

      {/* Zone B — Mission Line */}
      <section className="flex flex-col gap-2">
        <div
          className="text-xs font-medium tracking-wider"
          style={{ color: "var(--clime-fg-muted)" }}
        >
          {COPY.missionLabel}
        </div>
        <div
          className="text-lg font-semibold"
          style={{ fontSize: "var(--clime-text-title)", color: "var(--clime-fg)" }}
        >
          {mission.title}
        </div>
        <p style={{ fontSize: "var(--clime-text-body)", color: "var(--clime-fg-muted)" }}>
          {mission.description}
        </p>
      </section>

      {/* Zone C — Priority CTA Group */}
      <section className="flex flex-wrap items-center gap-3 py-2 border-y border-(--clime-border)">
        <Button variant="primary" onClick={handleStartMission}>
          {COPY.cta.start}
        </Button>
        <Button variant="secondary" onClick={handleReviewContent}>
          {COPY.cta.review}
        </Button>
        <Button
          variant="secondary"
          disabled={!capabilities.canPublish || challengePause.active}
          onClick={handleAutoPublish}
        >
          {COPY.cta.publish}
        </Button>
        <Button variant="ghost" onClick={handleExportBackup}>
          {COPY.cta.export}
        </Button>
      </section>

      <ChallengePauseBanner
        visible={challengePause.active}
        platform={challengePause.platform}
        traceId={challengePause.traceId ?? traceId ?? undefined}
        onOpenInbox={() => setInboxOpen(true)}
        onResume={() => void handleResumePublish()}
      />

      {notice ? (
        <div
          className="p-3 rounded text-xs font-mono border"
          style={{
            backgroundColor: "var(--clime-bg-elevated)",
            borderColor: "var(--clime-border)",
            color: "var(--clime-fg)",
            fontSize: "var(--clime-text-mono)",
          }}
        >
          {notice}
        </div>
      ) : null}

      {/* Zone D — Status Board */}
      <Panel elevated>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-(--clime-border) pb-2">
            <h2 className="font-semibold text-sm" style={{ fontSize: "var(--clime-text-ui)" }}>
              {COPY.status.title}
            </h2>
            <span
              className="text-xs"
              style={{
                fontSize: "var(--clime-text-caption)",
                color: "var(--clime-fg-muted)",
              }}
            >
              {COPY.status.honesty}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge
              capability="canPublish"
              tone={capabilities.canPublish && !challengePause.active ? "success" : "warning"}
            >
              {capabilities.canPublish && !challengePause.active
                ? COPY.status.canPublishYes
                : COPY.status.canPublishNo}
            </Badge>
            <Badge capability="publishMode" tone="neutral">
              {COPY.status.publishMode}: {labelPublishMode(capabilities.publishMode)}
            </Badge>
            <Badge
              capability="riskLevel"
              tone={
                capabilities.riskLevel === "low"
                  ? "success"
                  : capabilities.riskLevel === "medium"
                    ? "warning"
                    : "danger"
              }
            >
              {COPY.status.risk}: {labelRisk(capabilities.riskLevel)}
            </Badge>
          </div>

          <div className="flex flex-col gap-1">
            <DataRow
              label={COPY.status.workState}
              value={
                <Badge
                  tone={
                    mission.status === "RUNNING"
                      ? "info"
                      : mission.status === "PUBLISHED"
                        ? "success"
                        : mission.status === "PAUSED_CHALLENGE"
                          ? "danger"
                          : "neutral"
                  }
                >
                  {labelWorkState(mission.status)}
                </Badge>
              }
            />
            <DataRow
              label={COPY.status.lastJob}
              value={
                <span
                  style={{
                    fontFamily: "var(--clime-font-mono)",
                    fontSize: "var(--clime-text-mono)",
                  }}
                >
                  {lastJobId ?? COPY.status.none}
                </span>
              }
            />
            <DataRow
              label={COPY.status.trace}
              value={
                <span
                  style={{
                    fontFamily: "var(--clime-font-mono)",
                    fontSize: "var(--clime-text-mono)",
                  }}
                >
                  {traceId ?? COPY.status.none}
                </span>
              }
            />
          </div>

          <div
            style={{
              borderTop: "1px solid var(--clime-border)",
              paddingTop: "var(--clime-space-3)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--clime-space-2)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--clime-space-2)",
              }}
            >
              <strong style={{ fontSize: "var(--clime-text-ui)" }}>
                {COPY.status.accountsTitle}
              </strong>
              <Button
                variant="ghost"
                onClick={() => {
                  setIaSurface("account");
                  void refreshAccounts();
                }}
              >
                {COPY.status.accountsOpen}
              </Button>
            </div>
            {connectedAccounts.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  fontSize: "var(--clime-text-caption)",
                  color: "var(--clime-fg-muted)",
                }}
              >
                {COPY.status.accountsEmpty}
              </p>
            ) : (
              connectedAccounts.map((acc) => (
                <div
                  key={acc.id}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "var(--clime-space-2)",
                  }}
                >
                  <Badge tone="success">{COPY.status.accountsConnected}</Badge>
                  <span style={{ fontSize: "var(--clime-text-ui)" }}>
                    {labelPlatform(acc.platform)} · {acc.accountName}
                  </span>
                  {acc.credentialRef ? (
                    <Badge tone="neutral">{COPY.status.accountsLoginSaved}</Badge>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </Panel>

      {/* Zone E — Decision Explain ("Why") */}
      <Panel>
        <div className="flex flex-col gap-2">
          <div
            className="text-xs font-semibold tracking-wider"
            style={{ color: "var(--clime-fg-muted)" }}
          >
            {COPY.whyTitle}
          </div>
          <p
            style={{
              fontSize: "var(--clime-text-ui)",
              color: "var(--clime-fg)",
            }}
          >
            {mission.summary}
          </p>
        </div>
      </Panel>

      {reviewMode ? (
        <Panel elevated>
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-sm">{COPY.reviewTitle}</h3>
            <p className="text-xs text-(--clime-fg-muted)">{COPY.reviewBody}</p>
          </div>
        </Panel>
      ) : null}

      <AiInbox
        open={inboxOpen}
        onClose={() => setInboxOpen(false)}
        onOpenAccount={() => setWizardOpen(true)}
        onResumePublish={(accountId) => void handleResumePublish(accountId)}
      />

      <PublishingHistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />

      <ExecutiveDashboard
        open={executiveOpen}
        onClose={() => setExecutiveOpen(false)}
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <KnowledgeBrowser
        open={knowledgeOpen}
        onClose={() => setKnowledgeOpen(false)}
      />

      <AiConnectionWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onFinished={() => {
          setWizardOpen(false);
          void refreshAccounts();
          void refreshMatrix();
        }}
      />

      <IaSurfaces
        surface={iaSurface}
        onSurfaceChange={setIaSurface}
        onClose={() => setIaSurface(null)}
        onOpenWizard={() => {
          setIaSurface(null);
          setWizardOpen(true);
        }}
        onOpenHistory={() => {
          setIaSurface(null);
          setHistoryOpen(true);
        }}
      />

      <CommandPalette
        open={quickOpen}
        title={COPY.quickTitle}
        query={quickQuery}
        onQueryChange={setQuickQuery}
        onClose={() => setQuickOpen(false)}
        items={quickItems}
      />
    </div>
  );
}
