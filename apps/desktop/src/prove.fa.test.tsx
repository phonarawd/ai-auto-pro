import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { SCHEMA_VERSION } from "@clime/shared";
import { bootstrapDesktopDomainApi } from "./main/bootstrap-domain-api.js";
import {
  HISTORY_KIND_LABELS,
  PublishingHistoryPanel,
} from "./renderer/components/PublishingHistoryPanel.js";
import { MissionCenterFrame } from "./renderer/components/MissionCenterFrame.js";

describe("F-A Brand → Validate + Publishing History UI", () => {
  it("setBrandRules → content.validate applies research Brand Intelligence", async () => {
    const ipcMain = { handle: vi.fn() };
    const boot = bootstrapDesktopDomainApi(ipcMain);
    try {
      await boot.storage.seedDefaults();

      const setRes = await boot.host.handleIpcRequest("domain:growth.setBrandRules", {
        requestId: "req_fa_brand",
        schema_version: SCHEMA_VERSION,
        traceId: "tr_fa_brand",
        args: {
          projectId: "seed_project_empty",
          forbiddenPhrases: ["완전 자동 수익"],
          requiredPhrases: ["CLIME"],
        },
      });
      expect(setRes.ok).toBe(true);

      const produced = await boot.contentEngine.produce({
        projectId: "seed_project_empty",
        body: "성장 팁만 있고 브랜드 마커가 없습니다.",
        traceId: "tr_fa_prod",
      });

      const validateRes = await boot.host.handleIpcRequest("domain:content.validate", {
        requestId: "req_fa_val",
        schema_version: SCHEMA_VERSION,
        traceId: "tr_fa_val",
        args: { contentItemId: produced.contentItemId },
      });
      expect(validateRes.ok).toBe(true);
      if (!validateRes.ok) throw new Error("validate ipc");
      const data = validateRes.data as {
        valid: boolean;
        checks?: Record<string, string>;
        errors?: string[];
      };
      expect(data.valid).toBe(false);
      expect(data.checks?.brand).toBe("fail");

      const okItem = await boot.contentEngine.produce({
        projectId: "seed_project_empty",
        body: "CLIME Growth Studio tip: research then validate before publish.",
        traceId: "tr_fa_ok",
      });
      const okVal = await boot.host.handleIpcRequest("domain:content.validate", {
        requestId: "req_fa_ok",
        schema_version: SCHEMA_VERSION,
        traceId: "tr_fa_ok_v",
        args: { contentItemId: okItem.contentItemId },
      });
      expect(okVal.ok).toBe(true);
      if (!okVal.ok) throw new Error("ok validate");
      expect((okVal.data as { valid: boolean }).valid).toBe(true);
    } finally {
      await boot.close();
    }
  });

  it("content.listHistory returns frozen kinds after produce", async () => {
    const ipcMain = { handle: vi.fn() };
    const boot = bootstrapDesktopDomainApi(ipcMain);
    try {
      await boot.storage.seedDefaults();
      await boot.contentEngine.produce({
        projectId: "seed_project_empty",
        body: "History draft event body.",
        traceId: "tr_fa_hist",
      });

      const histRes = await boot.host.handleIpcRequest("domain:content.listHistory", {
        requestId: "req_fa_hist",
        schema_version: SCHEMA_VERSION,
        traceId: "tr_fa_hist",
        args: { projectId: "seed_project_empty", limit: 20 },
      });
      expect(histRes.ok).toBe(true);
      if (!histRes.ok) throw new Error("listHistory");
      const rows = histRes.data as Array<{ kind: string }>;
      expect(rows.some((r) => r.kind === "draft")).toBe(true);
      for (const row of rows) {
        expect(Object.keys(HISTORY_KIND_LABELS)).toContain(row.kind);
      }
    } finally {
      await boot.close();
    }
  });

  it("PublishingHistoryPanel renders all six kind legends + Mission Center entry", () => {
    const historyHtml = renderToString(
      <PublishingHistoryPanel open projectId="seed_project_empty" onClose={() => undefined} />,
    );
    expect(historyHtml).toMatch(/올린 기록|Publishing History/);
    expect(historyHtml).toContain('data-clime-surface="PublishingHistory"');
    for (const kind of Object.keys(HISTORY_KIND_LABELS)) {
      expect(historyHtml).toContain(kind);
    }

    const missionHtml = renderToString(<MissionCenterFrame />);
    expect(missionHtml).toMatch(/올린 기록|게시 이력/);
    expect(missionHtml).toContain("CLIME AI Growth Studio");
  });
});
