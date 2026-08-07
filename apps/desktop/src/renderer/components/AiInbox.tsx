import React, { useCallback, useEffect, useState } from "react";
import { Badge, Button, DataRow, Panel, Toast } from "@clime/ui";
import { COPY } from "../uiCopy.js";

export type InboxItemView = {
  schema_version: 1;
  id: string;
  kind: string;
  title: string;
  body: string;
  severity: "info" | "success" | "warning" | "danger";
  read: boolean;
  dismissed: boolean;
  createdAt: string;
  traceId?: string;
  jobId?: string;
  accountId?: string;
  platform?: string;
  terminalState?: "PAUSED_CHALLENGE";
  actions?: Array<{ id: string; label: string; kind: string }>;
};

export type AiInboxProps = {
  open: boolean;
  onClose: () => void;
  onResumePublish?: (accountId?: string) => void;
  onOpenAccount?: () => void;
};

function toneFor(severity: InboxItemView["severity"]) {
  return severity;
}

/**
 * AI Inbox — job progress, challenge pauses, doctor notices.
 * Toast → Inbox handoff only; no bypass CTA.
 */
export function AiInbox({ open, onClose, onResumePublish, onOpenAccount }: AiInboxProps) {
  const [items, setItems] = useState<InboxItemView[]>([]);
  const [toastItem, setToastItem] = useState<InboxItemView | null>(null);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined" || !window.domainClient?.notification?.listInbox) {
      return;
    }
    try {
      const list = await window.domainClient.notification.listInbox({});
      setItems(Array.isArray(list) ? (list as InboxItemView[]) : []);
    } catch {
      /* keep last known */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.domainClient?.notification?.subscribePush) {
      return;
    }
    const unsub = window.domainClient.notification.subscribePush((item) => {
      const view = item as InboxItemView;
      setItems((prev) => [view, ...prev.filter((p) => p.id !== view.id)]);
      if (view.kind === "challenge.pause" || view.severity === "danger" || view.severity === "warning") {
        setToastItem(view);
      }
    });
    return unsub;
  }, []);

  const handleMarkRead = async (itemId: string) => {
    await window.domainClient?.notification?.markRead?.({ itemId });
    void refresh();
  };

  const handleDismiss = async (itemId: string) => {
    await window.domainClient?.notification?.dismiss?.({ itemId });
    void refresh();
  };

  const handleAction = async (item: InboxItemView, actionKind: string) => {
    if (actionKind === "resume-publish") {
      onResumePublish?.(item.accountId);
      return;
    }
    if (actionKind === "open-account") {
      onOpenAccount?.();
      return;
    }
    if (actionKind === "dismiss") {
      await handleDismiss(item.id);
    }
    if (actionKind === "mark-read") {
      await handleMarkRead(item.id);
    }
  };

  if (!open) return null;

  const challengeItems = items.filter((i) => i.terminalState === "PAUSED_CHALLENGE");

  return (
    <div
      className="clime-ai-inbox"
      data-clime-surface="AiInbox"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
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
        aria-label={COPY.inbox.title}
        style={{
          width: "min(420px, 100vw)",
          height: "100%",
          background: "var(--clime-bg)",
          borderLeft: "1px solid var(--clime-border)",
          color: "var(--clime-fg)",
          fontFamily: "var(--clime-font-sans)",
          display: "flex",
          flexDirection: "column",
          padding: "var(--clime-space-4)",
          gap: "var(--clime-space-3)",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid var(--clime-border)",
            paddingBottom: "var(--clime-space-3)",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "var(--clime-text-title)" }}>{COPY.inbox.title}</h2>
            <p
              style={{
                margin: 0,
                fontSize: "var(--clime-text-caption)",
                color: "var(--clime-fg-muted)",
              }}
            >
              {COPY.inbox.subtitle}
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            {COPY.inbox.close}
          </Button>
        </header>

        {challengeItems.length > 0 ? (
          <Panel elevated data-clime-challenge-pause="true" data-terminal="PAUSED_CHALLENGE">
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--clime-space-2)" }}>
              <Badge tone="danger">{COPY.challenge.badge}</Badge>
              <p style={{ margin: 0, fontSize: "var(--clime-text-ui)" }}>
                {COPY.inbox.challengeBanner}
              </p>
            </div>
          </Panel>
        ) : null}

        {toastItem ? (
          <Toast
            tone={toneFor(toastItem.severity)}
            inboxHandoff={{ kind: "inbox", itemId: toastItem.id }}
            onOpenInbox={() => setToastItem(null)}
          >
            {toastItem.title}
          </Toast>
        ) : null}

        <div
          style={{
            flex: 1,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "var(--clime-space-2)",
          }}
        >
          {items.length === 0 ? (
            <p style={{ color: "var(--clime-fg-muted)", fontSize: "var(--clime-text-ui)" }}>
              Inbox가 비어 있습니다.
            </p>
          ) : (
            items.map((item) => (
              <Panel
                key={item.id}
                elevated={item.kind === "challenge.pause"}
                data-inbox-item-id={item.id}
                data-inbox-kind={item.kind}
                style={{
                  animation: item.read
                    ? undefined
                    : "clime-inbox-arrive var(--clime-motion-inbox) var(--clime-ease-out)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--clime-space-2)" }}>
                  <div style={{ display: "flex", gap: "var(--clime-space-2)", alignItems: "center" }}>
                    <Badge tone={toneFor(item.severity)}>{item.kind}</Badge>
                    {!item.read ? <Badge tone="info">NEW</Badge> : null}
                  </div>
                  <strong style={{ fontSize: "var(--clime-text-ui)" }}>{item.title}</strong>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "var(--clime-text-caption)",
                      color: "var(--clime-fg-muted)",
                    }}
                  >
                    {item.body}
                  </p>
                  {item.traceId ? (
                    <DataRow
                      label="Trace ID"
                      value={
                        <span
                          style={{
                            fontFamily: "var(--clime-font-mono)",
                            fontSize: "var(--clime-text-mono)",
                          }}
                        >
                          {item.traceId}
                        </span>
                      }
                    />
                  ) : null}
                  {item.jobId ? (
                    <DataRow
                      label="Job ID"
                      value={
                        <span
                          style={{
                            fontFamily: "var(--clime-font-mono)",
                            fontSize: "var(--clime-text-mono)",
                          }}
                        >
                          {item.jobId}
                        </span>
                      }
                    />
                  ) : null}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--clime-space-2)" }}>
                    {(item.actions ?? []).map((action) => (
                      <Button
                        key={action.id}
                        variant="secondary"
                        onClick={() => void handleAction(item, action.kind)}
                      >
                        {action.label}
                      </Button>
                    ))}
                    {!item.read ? (
                      <Button variant="ghost" onClick={() => void handleMarkRead(item.id)}>
                        읽음
                      </Button>
                    ) : null}
                    <Button variant="ghost" onClick={() => void handleDismiss(item.id)}>
                      닫기
                    </Button>
                  </div>
                </div>
              </Panel>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
