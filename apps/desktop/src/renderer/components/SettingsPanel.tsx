import React, { useCallback, useEffect, useState } from "react";
import { Badge, Button, DataRow, Panel, Toolbar } from "@clime/ui";
import { COPY } from "../uiCopy.js";

export type SettingsScopeTab = "global" | "project" | "user";

export type SettingsItemView = {
  key: string;
  kind: "value" | "ref";
  value?: unknown;
  ref?: string;
  effectiveSource?: SettingsScopeTab;
};

export type PersonaPrefsView = {
  personas: string[];
  emotions: string[];
  notes?: string;
};

export type SettingsPanelProps = {
  open: boolean;
  onClose: () => void;
  projectId?: string;
};

const SCOPES: SettingsScopeTab[] = ["global", "project", "user"];

const STARTER_KEYS = ["ui.theme", "ui.locale", "ui.density"] as const;

function displayValue(item: SettingsItemView | undefined): string {
  if (!item) return "";
  if (item.kind === "ref") return item.ref ?? "";
  if (typeof item.value === "string") return item.value;
  if (item.value === undefined || item.value === null) return "";
  return JSON.stringify(item.value);
}

/**
 * Settings — Global→Project→User cascade + research-owned Persona/Emotion prefs.
 * Secondary surface. No Workspace/Team Mode (L+). Domain API only.
 */
export function SettingsPanel({
  open,
  onClose,
  projectId,
}: SettingsPanelProps) {
  const [scope, setScope] = useState<SettingsScopeTab>("global");
  const [items, setItems] = useState<SettingsItemView[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState("ui.theme");
  const [newValue, setNewValue] = useState("");
  const [persona, setPersona] = useState<PersonaPrefsView>({
    personas: [],
    emotions: [],
  });
  const [personaDraft, setPersonaDraft] = useState({
    personas: "",
    emotions: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined" || !window.domainClient?.settings) {
      return;
    }
    setBusy(true);
    try {
      const getter =
        scope === "global"
          ? window.domainClient.settings.getGlobal
          : scope === "project"
            ? window.domainClient.settings.getProject
            : window.domainClient.settings.getUser;
      const res = (await getter({ projectId })) as {
        items?: SettingsItemView[];
        errors?: string[];
      };
      const listed = Array.isArray(res?.items) ? res.items : [];
      setItems(listed);
      const nextDrafts: Record<string, string> = {};
      for (const key of STARTER_KEYS) {
        const found = listed.find((i) => i.key === key);
        nextDrafts[key] = displayValue(found);
      }
      for (const item of listed) {
        if (!(item.key in nextDrafts)) {
          nextDrafts[item.key] = displayValue(item);
        }
      }
      setDrafts(nextDrafts);

      if (window.domainClient.growth?.getPersonaPrefs) {
        const prefs = (await window.domainClient.growth.getPersonaPrefs({
          projectId,
        })) as PersonaPrefsView;
        setPersona({
          personas: Array.isArray(prefs?.personas) ? prefs.personas : [],
          emotions: Array.isArray(prefs?.emotions) ? prefs.emotions : [],
          notes: typeof prefs?.notes === "string" ? prefs.notes : "",
        });
        setPersonaDraft({
          personas: (prefs?.personas ?? []).join(", "),
          emotions: (prefs?.emotions ?? []).join(", "),
          notes: typeof prefs?.notes === "string" ? prefs.notes : "",
        });
      }
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [projectId, scope]);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, refresh]);

  const saveKey = async (key: string, raw: string) => {
    if (!window.domainClient?.settings) return;
    if (key.startsWith("workspace.") || key.startsWith("team.") || key === "workspace" || key === "team") {
      setError("Workspace/Team Mode settings are not available until Team Mode (L+)");
      return;
    }
    setBusy(true);
    try {
      const setter =
        scope === "global"
          ? window.domainClient.settings.setGlobal
          : scope === "project"
            ? window.domainClient.settings.setProject
            : window.domainClient.settings.setUser;
      const res = (await setter({
        key,
        value: raw,
        projectId,
      })) as { saved?: boolean; code?: string; message?: string };
      if (!res?.saved) {
        setError(res?.message ?? res?.code ?? "Save failed");
      } else {
        setError(null);
        await refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const savePersona = async () => {
    if (!window.domainClient?.growth?.setPersonaPrefs) return;
    setBusy(true);
    try {
      const split = (s: string) =>
        s
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
      const res = (await window.domainClient.growth.setPersonaPrefs({
        projectId,
        personas: split(personaDraft.personas),
        emotions: split(personaDraft.emotions),
        notes: personaDraft.notes || undefined,
      })) as { ok?: boolean; prefs?: PersonaPrefsView };
      if (res?.ok === false) {
        setError(COPY.settings.personaSaveFail);
      } else {
        setError(null);
        if (res?.prefs) {
          setPersona({
            personas: res.prefs.personas ?? [],
            emotions: res.prefs.emotions ?? [],
            notes: res.prefs.notes,
          });
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const keysToShow = Array.from(
    new Set([...STARTER_KEYS, ...items.map((i) => i.key), ...Object.keys(drafts)]),
  );

  return (
    <div
      className="clime-settings-panel"
      data-clime-surface="SettingsPanel"
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
        aria-label={COPY.settings.title}
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
            {COPY.settings.title}
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
            적용 순서: 전체 → 이 프로젝트 → 내 설정. 팀/워크스페이스 설정은 없습니다.
          </p>

          <div style={{ display: "flex", gap: "var(--clime-space-2)", flexWrap: "wrap" }}>
            {SCOPES.map((s) => (
              <Button
                key={s}
                variant={scope === s ? "primary" : "secondary"}
                onClick={() => setScope(s)}
              >
                {s === "global"
                  ? COPY.settings.global
                  : s === "project"
                    ? COPY.settings.project
                    : COPY.settings.user}
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
                {COPY.settings.cascadeTitle} (
                {scope === "global"
                  ? COPY.settings.global
                  : scope === "project"
                    ? COPY.settings.project
                    : COPY.settings.user}
                )
              </div>
              {keysToShow.map((key) => {
                const item = items.find((i) => i.key === key);
                return (
                  <div
                    key={key}
                    style={{
                      borderTop: "1px solid var(--clime-border)",
                      paddingTop: "var(--clime-space-2)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--clime-space-1)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--clime-space-2)",
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          fontFamily: "var(--clime-font-mono)",
                          fontSize: "var(--clime-text-mono)",
                        }}
                      >
                        {key}
                      </span>
                      {item?.effectiveSource ? (
                        <Badge tone="neutral">
                          {COPY.settings.effective}:{" "}
                          {item.effectiveSource === "global"
                            ? COPY.settings.global
                            : item.effectiveSource === "project"
                              ? COPY.settings.project
                              : COPY.settings.user}
                        </Badge>
                      ) : null}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "var(--clime-space-2)",
                        alignItems: "center",
                      }}
                    >
                      <input
                        aria-label={`value-${key}`}
                        value={drafts[key] ?? ""}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [key]: e.target.value }))
                        }
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
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() => void saveKey(key, drafts[key] ?? "")}
                      >
                        저장
                      </Button>
                    </div>
                  </div>
                );
              })}

              <div
                style={{
                  borderTop: "1px solid var(--clime-border)",
                  paddingTop: "var(--clime-space-2)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--clime-space-2)",
                }}
              >
                <div
                  style={{
                    fontSize: "var(--clime-text-caption)",
                    color: "var(--clime-fg-muted)",
                  }}
                >
                  {COPY.settings.addKey}
                </div>
                <input
                  aria-label="new-settings-key"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="예: ui.theme"
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
                  aria-label="new-settings-value"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="값"
                  style={{
                    background: "var(--clime-bg-elevated)",
                    border: "1px solid var(--clime-border)",
                    color: "var(--clime-fg)",
                    fontFamily: "var(--clime-font-sans)",
                    fontSize: "var(--clime-text-ui)",
                    padding: "var(--clime-space-2)",
                  }}
                />
                <Button
                  variant="primary"
                  disabled={busy || !newKey.trim()}
                  onClick={() => {
                    void saveKey(newKey.trim(), newValue).then(() => {
                      setNewValue("");
                    });
                  }}
                >
                  {COPY.settings.addSave}
                </Button>
              </div>
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
                {COPY.settings.personaTitle}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "var(--clime-text-caption)",
                  color: "var(--clime-fg-muted)",
                }}
              >
                {COPY.settings.personaHelp}
              </p>
              <DataRow
                label={COPY.settings.personas}
                value={`${persona.personas.length}개 저장됨`}
              />
              <label style={{ fontSize: "var(--clime-text-caption)" }}>
                {COPY.settings.personasHint}
                <input
                  aria-label="persona-list"
                  value={personaDraft.personas}
                  onChange={(e) =>
                    setPersonaDraft((d) => ({ ...d, personas: e.target.value }))
                  }
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: "var(--clime-space-1)",
                    background: "var(--clime-bg-elevated)",
                    border: "1px solid var(--clime-border)",
                    color: "var(--clime-fg)",
                    fontFamily: "var(--clime-font-sans)",
                    fontSize: "var(--clime-text-ui)",
                    padding: "var(--clime-space-2)",
                  }}
                />
              </label>
              <label style={{ fontSize: "var(--clime-text-caption)" }}>
                {COPY.settings.emotions}
                <input
                  aria-label="emotion-list"
                  value={personaDraft.emotions}
                  onChange={(e) =>
                    setPersonaDraft((d) => ({ ...d, emotions: e.target.value }))
                  }
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: "var(--clime-space-1)",
                    background: "var(--clime-bg-elevated)",
                    border: "1px solid var(--clime-border)",
                    color: "var(--clime-fg)",
                    fontFamily: "var(--clime-font-sans)",
                    fontSize: "var(--clime-text-ui)",
                    padding: "var(--clime-space-2)",
                  }}
                />
              </label>
              <label style={{ fontSize: "var(--clime-text-caption)" }}>
                {COPY.settings.notes}
                <textarea
                  aria-label="persona-notes"
                  value={personaDraft.notes}
                  onChange={(e) =>
                    setPersonaDraft((d) => ({ ...d, notes: e.target.value }))
                  }
                  rows={3}
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: "var(--clime-space-1)",
                    background: "var(--clime-bg-elevated)",
                    border: "1px solid var(--clime-border)",
                    color: "var(--clime-fg)",
                    fontFamily: "var(--clime-font-sans)",
                    fontSize: "var(--clime-text-ui)",
                    padding: "var(--clime-space-2)",
                    resize: "vertical",
                  }}
                />
              </label>
              <Button variant="primary" disabled={busy} onClick={() => void savePersona()}>
                {COPY.settings.savePersona}
              </Button>
            </div>
          </Panel>
        </div>
      </aside>
    </div>
  );
}
