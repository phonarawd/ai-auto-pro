import React, { useCallback, useEffect, useState } from "react";
import { Badge, Button, DataRow, Panel, Toolbar } from "@clime/ui";
import { COPY, labelPublishMode } from "../uiCopy.js";

/** Frozen PublishingHistoryEvent.kind enum (Constitution / C1A) — Korean display labels. */
export const HISTORY_KIND_LABELS = {
  draft: COPY.history.kinds.draft,
  export: COPY.history.kinds.export,
  scheduled: COPY.history.kinds.scheduled,
  posted_manual: COPY.history.kinds.posted_manual,
  posted_api: COPY.history.kinds.posted_api,
  posted_session: COPY.history.kinds.posted_session,
} as const;

export type HistoryKind = keyof typeof HISTORY_KIND_LABELS;

export type HistoryEventView = {
  id: string;
  kind: string;
  contentItemId?: string | null;
  accountId?: string | null;
  publishMode?: string | null;
  exportPath?: string | null;
  externalPostId?: string | null;
  occurredAt: string;
};

export type PublishingHistoryPanelProps = {
  open: boolean;
  onClose: () => void;
  projectId?: string;
};

function toneForKind(kind: string): "neutral" | "info" | "success" | "warning" | "accent" {
  switch (kind) {
    case "posted_api":
    case "posted_session":
    case "posted_manual":
      return "success";
    case "export":
      return "info";
    case "scheduled":
      return "accent";
    case "draft":
      return "neutral";
    default:
      return "warning";
  }
}

/**
 * Publishing History — Content ops surface (Toolbar + Panel + DataRow + Badge).
 * Enums only: draft | export | scheduled | posted_manual | posted_api | posted_session.
 */
export function PublishingHistoryPanel({
  open,
  onClose,
  projectId,
}: PublishingHistoryPanelProps) {
  const [events, setEvents] = useState<HistoryEventView[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined" || !window.domainClient?.content?.listHistory) {
      return;
    }
    try {
      const list = await window.domainClient.content.listHistory({
        projectId,
        limit: 50,
      });
      setEvents(Array.isArray(list) ? (list as HistoryEventView[]) : []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [projectId]);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, refresh]);

  if (!open) return null;

  return (
    <div
      className="clime-publishing-history"
      data-clime-surface="PublishingHistory"
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
        aria-label={COPY.history.title}
        style={{
          width: "min(480px, 100vw)",
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
            {COPY.history.title}
          </strong>
          <Button variant="ghost" onClick={() => void refresh()}>
            다시 불러오기
          </Button>
          <Button variant="ghost" onClick={onClose}>
            닫기
          </Button>
        </Toolbar>

        <div
          style={{
            padding: "var(--clime-space-3) var(--clime-space-4)",
            borderBottom: "1px solid var(--clime-border)",
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--clime-space-2)",
          }}
        >
          {(Object.keys(HISTORY_KIND_LABELS) as HistoryKind[]).map((kind) => (
            <Badge key={kind} tone={toneForKind(kind)} data-history-kind-legend={kind}>
              {HISTORY_KIND_LABELS[kind]}
            </Badge>
          ))}
        </div>

        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "var(--clime-space-4)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--clime-space-2)",
          }}
        >
          {error ? (
            <Panel elevated>
              <p style={{ margin: 0, color: "var(--clime-danger)", fontSize: "var(--clime-text-ui)" }}>
                {error}
              </p>
            </Panel>
          ) : null}

          {events.length === 0 && !error ? (
            <p style={{ color: "var(--clime-fg-muted)", fontSize: "var(--clime-text-ui)" }}>
              아직 기록이 없습니다. 글을 만들거나 올리고, 파일로 보관한 뒤 여기에 쌓입니다.
            </p>
          ) : (
            events.map((ev) => (
              <Panel
                key={ev.id}
                elevated
                data-history-event-id={ev.id}
                data-history-kind={ev.kind}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--clime-space-2)" }}>
                  <div style={{ display: "flex", gap: "var(--clime-space-2)", alignItems: "center" }}>
                    <Badge tone={toneForKind(ev.kind)}>
                      {HISTORY_KIND_LABELS[ev.kind as HistoryKind] ?? ev.kind}
                    </Badge>
                    {ev.publishMode ? (
                      <Badge tone="neutral">
                        {COPY.history.mode}: {labelPublishMode(ev.publishMode)}
                      </Badge>
                    ) : null}
                  </div>
                  <DataRow
                    label={COPY.history.occurred}
                    value={
                      <span
                        style={{
                          fontFamily: "var(--clime-font-mono)",
                          fontSize: "var(--clime-text-mono)",
                        }}
                      >
                        {ev.occurredAt}
                      </span>
                    }
                  />
                  {ev.contentItemId ? (
                    <DataRow
                      label={COPY.history.content}
                      value={ev.contentItemId.slice(0, 12) + "…"}
                    />
                  ) : null}
                  {ev.exportPath ? (
                    <DataRow label={COPY.history.exportPath} value={ev.exportPath} />
                  ) : null}
                  {ev.externalPostId ? (
                    <DataRow label={COPY.history.externalPost} value={ev.externalPostId} />
                  ) : null}
                </div>
              </Panel>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
