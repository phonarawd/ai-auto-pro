import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SCHEMA_VERSION } from "@clime/shared";
import { bootstrapDesktopDomainApi } from "./main/bootstrap-domain-api.js";
import { KnowledgeBrowser } from "./renderer/components/KnowledgeBrowser.js";
import { SettingsPanel } from "./renderer/components/SettingsPanel.js";

const here = dirname(fileURLToPath(import.meta.url));

describe("K1-C Settings/KB UX Gate + Domain wiring", () => {
  it("wires settings.* and knowledge.* (not stubs) + persona prefs", async () => {
    const channels: string[] = [];
    const ipcMain = {
      handle: (channel: string) => {
        channels.push(channel);
      },
    };
    const boot = bootstrapDesktopDomainApi(ipcMain);
    try {
      expect(channels).toContain("domain:settings.getGlobal");
      expect(channels).toContain("domain:settings.setUser");
      expect(channels).toContain("domain:knowledge.list");
      expect(channels).toContain("domain:knowledge.put");
      expect(channels).toContain("domain:growth.getPersonaPrefs");
      expect(channels).toContain("domain:growth.setPersonaPrefs");

      const setRes = await boot.host.handleIpcRequest("domain:settings.setGlobal", {
        requestId: "req_k1_1",
        schema_version: SCHEMA_VERSION,
        traceId: "tr_k1_1",
        args: { key: "ui.theme", value: "ops" },
      });
      expect(setRes.ok).toBe(true);
      if (!setRes.ok) throw new Error("setGlobal failed");
      expect((setRes.data as { saved: boolean }).saved).toBe(true);

      const workspaceDenied = await boot.host.handleIpcRequest(
        "domain:settings.setUser",
        {
          requestId: "req_k1_ws",
          schema_version: SCHEMA_VERSION,
          traceId: "tr_k1_ws",
          args: { key: "workspace.slug", value: "team-x" },
        },
      );
      expect(workspaceDenied.ok).toBe(true);
      if (!workspaceDenied.ok) throw new Error("workspace invoke failed");
      expect((workspaceDenied.data as { saved: boolean; code?: string }).saved).toBe(
        false,
      );
      expect((workspaceDenied.data as { code?: string }).code).toBe(
        "WORKSPACE_FORBIDDEN",
      );

      const kbPut = await boot.host.handleIpcRequest("domain:knowledge.put", {
        requestId: "req_k1_kb",
        schema_version: SCHEMA_VERSION,
        traceId: "tr_k1_kb",
        args: {
          namespace: "strategy",
          type: "playbook",
          tags: ["k1"],
          body: { title: "prove" },
        },
      });
      expect(kbPut.ok).toBe(true);
      if (!kbPut.ok) throw new Error("knowledge.put failed");
      expect((kbPut.data as { saved: boolean }).saved).toBe(true);

      const persona = await boot.host.handleIpcRequest(
        "domain:growth.setPersonaPrefs",
        {
          requestId: "req_k1_p",
          schema_version: SCHEMA_VERSION,
          traceId: "tr_k1_p",
          args: { personas: ["ops"], emotions: ["focus"] },
        },
      );
      expect(persona.ok).toBe(true);
      if (!persona.ok) throw new Error("setPersonaPrefs failed");
      expect((persona.data as { ok: boolean }).ok).toBe(true);
    } finally {
      await boot.close();
    }
  });

  it("SettingsPanel UX Gate — cascade scopes, no Workspace, no START", () => {
    const html = renderToStaticMarkup(
      createElement(SettingsPanel, { open: true, onClose: () => undefined }),
    );
    expect(html).toContain('data-clime-surface="SettingsPanel"');
    expect(html).toMatch(/전체 → 이 프로젝트 → 내 설정|Global → Project → User/);
    expect(html).toMatch(/말투·감정 설정|Persona \/ Emotion prefs/);
    expect(html.toLowerCase()).not.toContain("[start]");
    expect(html).not.toMatch(/Workspace\s+settings|Team Mode settings panel/i);
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    const settingsSrc = readFileSync(
      join(here, "renderer/components/SettingsPanel.tsx"),
      "utf8",
    );
    expect(settingsSrc).toMatch(/growth\/research|getPersonaPrefs/);
  });

  it("KnowledgeBrowser UX Gate — namespaced, Domain API only", () => {
    const html = renderToStaticMarkup(
      createElement(KnowledgeBrowser, { open: true, onClose: () => undefined }),
    );
    expect(html).toContain('data-clime-surface="KnowledgeBrowser"');
    expect(html).toMatch(/자료실|Knowledge Base/);
    expect(html).toContain("brand");
    expect(html).toContain("strategy");
    expect(html.toLowerCase()).not.toContain("[start]");
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);

    const src = readFileSync(
      join(here, "renderer/components/KnowledgeBrowser.tsx"),
      "utf8",
    );
    expect(src).toContain("domainClient.knowledge");
    expect(src).not.toMatch(/from\s+["']@clime\/growth-knowledge["']/);
    expect(src).not.toMatch(/from\s+["']@clime\/storage["']/);
  });

  it("Mission Center keeps home IA — Settings/KB secondary; ownership boundaries", () => {
    const mc = readFileSync(
      join(here, "renderer/components/MissionCenterFrame.tsx"),
      "utf8",
    );
    expect(mc).toContain("CLIME AI Growth Studio");
    expect(mc).toMatch(/오늘 홍보 시작|COPY\.cta\.start/);
    expect(mc).toMatch(/지금 상황|상태판|COPY\.status\.title/);
    expect(mc).toContain("SettingsPanel");
    expect(mc).toContain("KnowledgeBrowser");
    expect(mc).toContain("setSettingsOpen");
    expect(mc).toContain("setKnowledgeOpen");
    expect(mc).not.toMatch(/followers|impressions|ROI\s*\+/i);
    expect(mc).not.toMatch(/from\s+["']@clime\/config["']/);
    expect(mc).not.toMatch(/from\s+["']@clime\/growth-knowledge["']/);
    expect(mc).not.toMatch(/from\s+["']@clime\/growth-research["']/);

    const settings = readFileSync(
      join(here, "renderer/components/SettingsPanel.tsx"),
      "utf8",
    );
    expect(settings).toContain("domainClient.settings");
    expect(settings).toContain("domainClient.growth");
    expect(settings).toContain("getPersonaPrefs");
    expect(settings).not.toMatch(/from\s+["']@clime\/config["']/);
    expect(settings).not.toMatch(/from\s+["']@clime\/storage["']/);
    expect(settings).not.toMatch(/from\s+["']@clime\/growth-research["']/);
    expect(settings).toMatch(/팀\/워크스페이스|Workspace \/ Team Mode|Team Mode/);
    expect(settings).not.toMatch(/scope.*workspace|WorkspaceTab/i);
  });
});
