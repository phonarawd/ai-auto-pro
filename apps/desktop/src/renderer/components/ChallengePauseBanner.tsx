import React from "react";
import { Badge, Button, Panel } from "@clime/ui";
import { COPY } from "../uiCopy.js";

export type ChallengePauseBannerProps = {
  visible: boolean;
  platform?: string;
  traceId?: string;
  onOpenInbox: () => void;
  onResume?: () => void;
};

/**
 * Honest challenge pause surface — auto-pause + Inbox.
 * Zero bypass / captcha-solve CTAs (constitutional).
 */
export function ChallengePauseBanner({
  visible,
  platform,
  traceId,
  onOpenInbox,
  onResume,
}: ChallengePauseBannerProps) {
  if (!visible) return null;

  return (
    <Panel
      elevated
      data-clime-challenge-pause="true"
      data-bypass-cta="0"
      data-terminal="PAUSED_CHALLENGE"
      style={{
        borderLeft: "3px solid var(--clime-danger)",
        animation: "clime-inbox-arrive var(--clime-motion-inbox) var(--clime-ease-out)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--clime-space-2)" }}>
        <div style={{ display: "flex", gap: "var(--clime-space-2)", alignItems: "center" }}>
          <Badge tone="danger">{COPY.challenge.badge}</Badge>
          {platform ? <Badge tone="warning">{platform}</Badge> : null}
        </div>
        <strong style={{ fontSize: "var(--clime-text-ui)" }}>{COPY.challenge.title}</strong>
        <p
          style={{
            margin: 0,
            fontSize: "var(--clime-text-caption)",
            color: "var(--clime-fg-muted)",
          }}
        >
          {COPY.challenge.body}
        </p>
        {traceId ? (
          <code
            style={{
              fontFamily: "var(--clime-font-mono)",
              fontSize: "var(--clime-text-mono)",
              color: "var(--clime-fg)",
            }}
          >
            {COPY.status.trace}: {traceId}
          </code>
        ) : null}
        <div style={{ display: "flex", gap: "var(--clime-space-2)" }}>
          <Button variant="primary" onClick={onOpenInbox}>
            {COPY.challenge.openInbox}
          </Button>
          {onResume ? (
            <Button variant="secondary" onClick={onResume}>
              {COPY.challenge.resume}
            </Button>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}
