import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SCHEMA_VERSION } from "@clime/shared";
import { bootstrapDesktopDomainApi } from "./main/bootstrap-domain-api.js";
import { ExecutiveDashboard } from "./renderer/components/ExecutiveDashboard.js";

const here = dirname(fileURLToPath(import.meta.url));

describe("J-C Executive UX Gate + Domain wiring", () => {
  it("wires executive.* handlers on desktop host (overrides stubs)", async () => {
    const channels: string[] = [];
    const ipcMain = {
      handle: (channel: string) => {
        channels.push(channel);
      },
    };
    const boot = bootstrapDesktopDomainApi(ipcMain);
    try {
      expect(channels).toContain("domain:executive.getHorizon");
      expect(channels).toContain("domain:executive.setGoal");
      expect(channels).toContain("domain:executive.linkMission");
      expect(channels).toContain("domain:executive.getGoalChain");

      const setRes = await boot.host.handleIpcRequest("domain:executive.setGoal", {
        requestId: "req_jc_1",
        schema_version: SCHEMA_VERSION,
        traceId: "tr_jc_1",
        args: {
          horizon: "week",
          title: "UX Gate week",
          mixCaps: { reels: 20, blogs: 5 },
          kpis: [{ key: "reels_count", target: 20 }],
        },
      });
      expect(setRes.ok).toBe(true);
      if (!setRes.ok) throw new Error("setGoal failed");
      const goalId = (setRes.data as { goalId: string }).goalId;
      expect(goalId).not.toBe("goal_stub");

      const horizonRes = await boot.host.handleIpcRequest(
        "domain:executive.getHorizon",
        {
          requestId: "req_jc_2",
          schema_version: SCHEMA_VERSION,
          traceId: "tr_jc_2",
          args: { horizon: "week" },
        },
      );
      expect(horizonRes.ok).toBe(true);
      if (!horizonRes.ok) throw new Error("getHorizon failed");
      const data = horizonRes.data as {
        kind: string;
        goals: unknown[];
        narrative: string;
      };
      expect(data.kind).toBe("meta.horizon_status");
      expect(data.goals.length).toBeGreaterThan(0);
      expect(data.narrative).toContain("Decision Engine alone ranks today");
    } finally {
      await boot.close();
    }
  });

  it("ExecutiveDashboard is secondary surface — no daily queue CTAs", () => {
    const html = renderToStaticMarkup(
      createElement(ExecutiveDashboard, { open: true, onClose: () => undefined }),
    );
    expect(html).toContain('data-clime-surface="ExecutiveDashboard"');
    expect(html).toMatch(/주간·월간 목표|Executive Dashboard/);
    expect(html).toMatch(/주간·월간 목표|Week \/ Month \/ Quarter|이번 주/);
    expect(html).toMatch(/목표|Goal/);
    expect(html.toLowerCase()).not.toContain("[start]");
    expect(html.toLowerCase()).not.toContain("startmission");
    expect(html).not.toContain("planner queue");
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("Mission Center keeps home IA — Executive is opt-in panel, not hero vanity strip", () => {
    const mc = readFileSync(
      join(here, "renderer/components/MissionCenterFrame.tsx"),
      "utf8",
    );
    expect(mc).toContain("CLIME AI Growth Studio");
    expect(mc).toMatch(/오늘 홍보 시작|COPY\.cta\.start/);
    expect(mc).toMatch(/지금 상황|상태판|COPY\.status\.title/);
    expect(mc).toContain("ExecutiveDashboard");
    expect(mc).toContain("setExecutiveOpen");
    // Must not inject vanity KPI collage into Zone A/B/C
    expect(mc).not.toMatch(/followers|impressions|ROI\s*\+/i);
    expect(mc).not.toMatch(/from\s+["']@clime\/meta["']/);
    expect(mc).not.toMatch(/from\s+["']@clime\/growth-decision["']/);

    const dash = readFileSync(
      join(here, "renderer/components/ExecutiveDashboard.tsx"),
      "utf8",
    );
    expect(dash).toContain("domainClient.executive");
    expect(dash).not.toMatch(/from\s+["']@clime\/meta["']/);
    expect(dash).not.toMatch(/from\s+["']@clime\/storage["']/);
    expect(dash).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
