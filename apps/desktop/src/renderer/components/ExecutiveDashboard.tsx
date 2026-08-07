import React, { useCallback, useEffect, useState } from "react";
import { Badge, Button, DataRow, Panel, Toolbar } from "@clime/ui";
import { COPY } from "../uiCopy.js";

export type ExecutiveHorizon = "week" | "month" | "quarter";

export type GoalViewModel = {
  id: string;
  title: string;
  horizon: ExecutiveHorizon;
  status: string;
  kpi?: {
    theme?: string;
    target?: number;
    kpis?: Array<{ key: string; target: number; unit?: string }>;
    mixCaps?: Record<string, number>;
    missionLinks?: Array<{ missionId: string; title?: string }>;
  };
};

export type HorizonStatusView = {
  schema_version: 1;
  horizon: ExecutiveHorizon;
  status: string;
  theme?: string;
  mixCaps: Record<string, number>;
  goals: GoalViewModel[];
  constraintHint: string;
  narrative: string;
};

export type ReallocationView = {
  id: string;
  summary: string;
  isEstimate: boolean;
  estimateLabel?: string;
  rationale: string;
  fromFormat?: string;
  toFormat?: string;
};

export type ExecutiveDashboardProps = {
  open: boolean;
  onClose: () => void;
  projectId?: string;
};

const HORIZONS: ExecutiveHorizon[] = ["week", "month", "quarter"];

/**
 * Executive Dashboard — week/month/quarter envelopes + Goal→KPI→Mission.
 * Secondary surface (not Mission Center home). Domain API only. No daily queue controls.
 */
export function ExecutiveDashboard({
  open,
  onClose,
  projectId,
}: ExecutiveDashboardProps) {
  const [horizon, setHorizon] = useState<ExecutiveHorizon>("week");
  const [status, setStatus] = useState<HorizonStatusView | null>(null);
  const [reallocations, setReallocations] = useState<ReallocationView[]>([]);
  const [explain, setExplain] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (
      typeof window === "undefined" ||
      !window.domainClient?.executive?.getHorizon
    ) {
      return;
    }
    setBusy(true);
    try {
      const [horizonRes, reallocRes, explainRes] = await Promise.all([
        window.domainClient.executive.getHorizon({ projectId, horizon }),
        window.domainClient.executive.getReallocations({ projectId, horizon }),
        window.domainClient.executive.explainDecision({ projectId }),
      ]);

      setStatus(horizonRes as HorizonStatusView);
      const list = reallocRes as { items?: ReallocationView[] };
      setReallocations(Array.isArray(list?.items) ? list.items : []);
      const exp = explainRes as { narrative?: string };
      setExplain(typeof exp?.narrative === "string" ? exp.narrative : null);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [horizon, projectId]);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, refresh]);

  if (!open) return null;

  return (
    <div
      className="clime-executive-dashboard"
      data-clime-surface="ExecutiveDashboard"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 880,
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
        aria-label={COPY.executive.title}
        style={{
          width: "min(520px, 100vw)",
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
            {COPY.executive.title}
          </strong>
          <Button variant="ghost" onClick={() => void refresh()} disabled={busy}>
            다시 불러오기
          </Button>
          <Button variant="ghost" onClick={onClose}>
            닫기
          </Button>
        </Toolbar>

        <div
          style={{
            padding: "var(--clime-space-3)",
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "var(--clime-space-4)",
          }}
        >
          <p
            style={{
              fontSize: "var(--clime-text-caption)",
              color: "var(--clime-fg-muted)",
              margin: 0,
            }}
          >
            {COPY.executive.subtitle}
          </p>

          <div style={{ display: "flex", gap: "var(--clime-space-2)", flexWrap: "wrap" }}>
            {HORIZONS.map((h) => (
              <Button
                key={h}
                variant={horizon === h ? "primary" : "secondary"}
                onClick={() => setHorizon(h)}
              >
                {h === "week" ? "이번 주" : h === "month" ? "이번 달" : "이번 분기"}
              </Button>
            ))}
          </div>

          {error ? (
            <Panel>
              <DataRow label={COPY.common.error} value={error} />
            </Panel>
          ) : null}

          <Panel elevated>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--clime-space-2)" }}>
              <div
                style={{
                  fontSize: "var(--clime-text-caption)",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  color: "var(--clime-fg-muted)",
                }}
              >
                {COPY.executive.envelope}
              </div>
              <DataRow
                label={COPY.executive.status}
                value={
                  <Badge
                    tone={
                      status?.status === "active"
                        ? "success"
                        : status?.status === "paused"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {status?.status === "active"
                      ? "진행 중"
                      : status?.status === "paused"
                        ? "일시정지"
                        : (status?.status ?? (busy ? "…" : "—"))}
                  </Badge>
                }
              />
              <DataRow label={COPY.executive.theme} value={status?.theme ?? "—"} />
              <DataRow
                label={COPY.executive.mixCaps}
                value={
                  status?.mixCaps && Object.keys(status.mixCaps).length > 0
                    ? Object.entries(status.mixCaps)
                        .map(([k, v]) => `${k}:${v}`)
                        .join(" · ")
                    : "—"
                }
              />
              <DataRow
                label={COPY.executive.constraint}
                value={
                  <span
                    style={{
                      fontFamily: "var(--clime-font-mono)",
                      fontSize: "var(--clime-text-mono)",
                    }}
                  >
                    {status?.constraintHint ?? "—"}
                  </span>
                }
              />
              <p
                style={{
                  margin: 0,
                  fontSize: "var(--clime-text-ui)",
                  color: "var(--clime-fg)",
                }}
              >
                {status?.narrative ?? COPY.executive.notLoaded}
              </p>
            </div>
          </Panel>

          <Panel>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--clime-space-2)" }}>
              <div
                style={{
                  fontSize: "var(--clime-text-caption)",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  color: "var(--clime-fg-muted)",
                }}
              >
                {COPY.executive.chain}
              </div>
              {(status?.goals ?? []).length === 0 ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--clime-text-ui)",
                    color: "var(--clime-fg-muted)",
                  }}
                >
                  {COPY.executive.noGoals}
                </p>
              ) : (
                (status?.goals ?? []).map((g) => (
                  <div
                    key={g.id}
                    style={{
                      borderTop: "1px solid var(--clime-border)",
                      paddingTop: "var(--clime-space-2)",
                    }}
                  >
                    <DataRow label={COPY.executive.goal} value={g.title} />
                    <DataRow
                      label={COPY.executive.kpis}
                      value={
                        (g.kpi?.kpis ?? [])
                          .map((k) => `${k.key}:${k.target}${k.unit ? k.unit : ""}`)
                          .join(" · ") || "—"
                      }
                    />
                    <DataRow
                      label={COPY.executive.missions}
                      value={
                        (g.kpi?.missionLinks ?? [])
                          .map((m) => m.title || m.missionId)
                          .join(" · ") || "—"
                      }
                    />
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--clime-space-2)" }}>
              <div
                style={{
                  fontSize: "var(--clime-text-caption)",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  color: "var(--clime-fg-muted)",
                }}
              >
                {COPY.executive.realloc}
              </div>
              {reallocations.length === 0 ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--clime-text-ui)",
                    color: "var(--clime-fg-muted)",
                  }}
                >
                  {COPY.executive.noRealloc}
                </p>
              ) : (
                reallocations.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      borderTop: "1px solid var(--clime-border)",
                      paddingTop: "var(--clime-space-2)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--clime-space-2)",
                        marginBottom: "var(--clime-space-1)",
                      }}
                    >
                      <span style={{ fontSize: "var(--clime-text-ui)", flex: 1 }}>
                        {item.summary}
                      </span>
                      {item.isEstimate ? (
                        <Badge tone="warning">
                          {item.estimateLabel ?? "추정"}
                        </Badge>
                      ) : (
                        <Badge tone="neutral">{COPY.executive.fact}</Badge>
                      )}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "var(--clime-text-caption)",
                        color: "var(--clime-fg-muted)",
                      }}
                    >
                      {item.rationale}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Panel>

          {explain ? (
            <Panel>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--clime-space-2)" }}>
                <div
                  style={{
                    fontSize: "var(--clime-text-caption)",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    color: "var(--clime-fg-muted)",
                  }}
                >
                  {COPY.executive.explain}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--clime-text-ui)",
                    color: "var(--clime-fg)",
                  }}
                >
                  {explain}
                </p>
              </div>
            </Panel>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
