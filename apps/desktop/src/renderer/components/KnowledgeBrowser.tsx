import React, { useCallback, useEffect, useState } from "react";
import { Badge, Button, DataRow, Panel, Toolbar } from "@clime/ui";
import { COPY } from "../uiCopy.js";

const NAMESPACES = [
  "brand",
  "growth",
  "competitor",
  "system",
  "strategy",
] as const;

export type KnowledgeItemView = {
  id: string;
  namespace: string;
  type: string;
  tags: string[];
  body?: unknown;
  updatedAt?: string;
};

export type KnowledgeBrowserProps = {
  open: boolean;
  onClose: () => void;
  projectId?: string;
};

/**
 * Knowledge Store browser — one store filtered by namespace / type / tags.
 * Secondary surface. Domain API only.
 */
export function KnowledgeBrowser({
  open,
  onClose,
  projectId,
}: KnowledgeBrowserProps) {
  const [namespace, setNamespace] = useState<string>("growth");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<KnowledgeItemView[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftType, setDraftType] = useState("note");
  const [draftTags, setDraftTags] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined" || !window.domainClient?.knowledge) {
      return;
    }
    setBusy(true);
    try {
      const listed = query.trim()
        ? await window.domainClient.knowledge.search({
            projectId,
            query,
            namespace,
          })
        : await window.domainClient.knowledge.list({
            projectId,
            namespace,
          });
      const rows = (Array.isArray(listed) ? listed : []) as KnowledgeItemView[];
      setItems(rows);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [namespace, projectId, query]);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, refresh]);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  const putItem = async () => {
    if (!window.domainClient?.knowledge) return;
    setBusy(true);
    try {
      let body: unknown = draftBody;
      try {
        body = JSON.parse(draftBody) as unknown;
      } catch {
        body = draftBody;
      }
      const res = (await window.domainClient.knowledge.put({
        projectId,
        namespace,
        type: draftType.trim() || "note",
        tags: draftTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        body,
      })) as { saved?: boolean; id?: string };
      if (!res?.saved) {
        setError("Put failed");
      } else {
        setError(null);
        setDraftBody("");
        await refresh();
        if (res.id) setSelectedId(res.id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const deleteSelected = async () => {
    if (!selected || !window.domainClient?.knowledge) return;
    setBusy(true);
    try {
      await window.domainClient.knowledge.delete({
        projectId,
        id: selected.id,
      });
      setSelectedId(null);
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="clime-knowledge-browser"
      data-clime-surface="KnowledgeBrowser"
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
        aria-label={COPY.knowledge.title}
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
            {COPY.knowledge.title}
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
            자료를 주제·종류·태그로 찾아보세요. 팀용 별도 저장소는 없습니다.
          </p>

          <div style={{ display: "flex", gap: "var(--clime-space-2)", flexWrap: "wrap" }}>
            {NAMESPACES.map((ns) => (
              <Button
                key={ns}
                variant={namespace === ns ? "primary" : "secondary"}
                onClick={() => {
                  setNamespace(ns);
                  setSelectedId(null);
                }}
              >
                {ns}
              </Button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "var(--clime-space-2)" }}>
            <input
              aria-label="knowledge-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={COPY.knowledge.searchPlaceholder}
              style={{
                flex: 1,
                background: "var(--clime-bg-elevated)",
                border: "1px solid var(--clime-border)",
                color: "var(--clime-fg)",
                fontFamily: "var(--clime-font-sans)",
                fontSize: "var(--clime-text-ui)",
                padding: "var(--clime-space-2)",
              }}
            />
            <Button variant="secondary" disabled={busy} onClick={() => void refresh()}>
              {COPY.knowledge.search}
            </Button>
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
                {COPY.knowledge.items} ({namespace})
              </div>
              {items.length === 0 ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--clime-text-ui)",
                    color: "var(--clime-fg-muted)",
                  }}
                >
                  {COPY.knowledge.empty}
                </p>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    style={{
                      textAlign: "left",
                      borderTop: "1px solid var(--clime-border)",
                      paddingTop: "var(--clime-space-2)",
                      background: "transparent",
                      borderLeft: "none",
                      borderRight: "none",
                      borderBottom: "none",
                      color: "var(--clime-fg)",
                      cursor: "pointer",
                      fontFamily: "var(--clime-font-sans)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "var(--clime-space-2)",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ flex: 1, fontSize: "var(--clime-text-ui)" }}>
                        {item.type}
                      </span>
                      <Badge tone={selectedId === item.id ? "info" : "neutral"}>
                        {item.namespace}
                      </Badge>
                    </div>
                    <div
                      style={{
                        fontSize: "var(--clime-text-caption)",
                        color: "var(--clime-fg-muted)",
                        fontFamily: "var(--clime-font-mono)",
                      }}
                    >
                      {(item.tags ?? []).join(" · ") || COPY.knowledge.noTags}
                    </div>
                  </button>
                ))
              )}
            </div>
          </Panel>

          {selected ? (
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
                  {COPY.knowledge.selected}
                </div>
                <DataRow label={COPY.knowledge.id} value={selected.id} />
                <DataRow label={COPY.knowledge.type} value={selected.type} />
                <DataRow
                  label={COPY.knowledge.tags}
                  value={(selected.tags ?? []).join(", ") || "—"}
                />
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "var(--clime-font-mono)",
                    fontSize: "var(--clime-text-mono)",
                    background: "var(--clime-bg-elevated)",
                    padding: "var(--clime-space-2)",
                    border: "1px solid var(--clime-border)",
                  }}
                >
                  {typeof selected.body === "string"
                    ? selected.body
                    : JSON.stringify(selected.body ?? null, null, 2)}
                </pre>
                <Button variant="ghost" disabled={busy} onClick={() => void deleteSelected()}>
                  {COPY.knowledge.delete}
                </Button>
              </div>
            </Panel>
          ) : null}

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
                {COPY.knowledge.putTitle}
              </div>
              <input
                aria-label="knowledge-type"
                value={draftType}
                onChange={(e) => setDraftType(e.target.value)}
                placeholder={COPY.knowledge.type}
                style={{
                  background: "var(--clime-bg-elevated)",
                  border: "1px solid var(--clime-border)",
                  color: "var(--clime-fg)",
                  fontFamily: "var(--clime-font-mono)",
                  fontSize: "var(--clime-text-mono)",
                  padding: "var(--clime-space-2)",
                }}
              />
              <input
                aria-label="knowledge-tags"
                value={draftTags}
                onChange={(e) => setDraftTags(e.target.value)}
                placeholder={COPY.knowledge.tagsPlaceholder}
                style={{
                  background: "var(--clime-bg-elevated)",
                  border: "1px solid var(--clime-border)",
                  color: "var(--clime-fg)",
                  fontFamily: "var(--clime-font-sans)",
                  fontSize: "var(--clime-text-ui)",
                  padding: "var(--clime-space-2)",
                }}
              />
              <textarea
                aria-label="knowledge-body"
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                placeholder={COPY.knowledge.bodyPlaceholder}
                rows={4}
                style={{
                  background: "var(--clime-bg-elevated)",
                  border: "1px solid var(--clime-border)",
                  color: "var(--clime-fg)",
                  fontFamily: "var(--clime-font-mono)",
                  fontSize: "var(--clime-text-mono)",
                  padding: "var(--clime-space-2)",
                  resize: "vertical",
                }}
              />
              <Button variant="primary" disabled={busy} onClick={() => void putItem()}>
                {COPY.knowledge.put} ({namespace})
              </Button>
            </div>
          </Panel>
        </div>
      </aside>
    </div>
  );
}
