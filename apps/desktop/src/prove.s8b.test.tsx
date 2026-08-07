import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MissionCenterFrame } from "./renderer/components/MissionCenterFrame.js";
import { COPY } from "./renderer/uiCopy.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getAllSourceFiles(dir: string): string[] {
  const files: string[] = [];
  const items = readdirSync(dir);
  for (const item of items) {
    const full = join(dir, item);
    if (statSync(full).isDirectory()) {
      if (!item.includes("__eslint_fixtures__") && item !== "node_modules") {
        files.push(...getAllSourceFiles(full));
      }
    } else if (item.endsWith(".ts") || item.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

describe("8-B Mission Center v1 Implementation (s8-b)", () => {
  it("renders Zone A Brand, Zone B Mission line, Zone C CTA group, Zone D Status Board, Zone E Explain", () => {
    const html = renderToString(<MissionCenterFrame />);
    const cleanHtml = html.replace(/<!-- -->/g, "");

    expect(html).toContain("CLIME AI Growth Studio");
    expect(html).toContain(COPY.brandSubtitle);

    expect(html).toContain(COPY.missionLabel);
    expect(html).toContain("AI 트렌드 멀티잭 및 7채널 오가닉 리퍼포징");

    expect(html).toContain(COPY.cta.start);
    expect(html).toContain(COPY.cta.review);
    expect(html).toContain(COPY.cta.publish);
    expect(html).toContain(COPY.cta.export);

    expect(html).toContain(COPY.status.title);
    expect(html).toContain(COPY.status.honesty);
    expect(cleanHtml).toContain(COPY.status.canPublishYes);
    expect(cleanHtml).toContain(COPY.publishMode.api);
    expect(cleanHtml).toContain(COPY.risk.low);

    expect(html).toContain(COPY.whyTitle);
  });

  it("contains required capability matrix badges and task SM initial state", () => {
    const html = renderToString(<MissionCenterFrame />);
    const cleanHtml = html.replace(/<!-- -->/g, "");
    expect(cleanHtml).toContain(COPY.status.canPublishYes);
    expect(cleanHtml).toContain(COPY.publishMode.api);
    expect(cleanHtml).toContain(COPY.risk.low);
    expect(html).toContain(COPY.workState.READY);
  });

  it("prohibits vanity KPI cards / collages on Mission Center home", () => {
    const html = renderToString(<MissionCenterFrame />);
    expect(html).not.toMatch(/Followers/i);
    expect(html).not.toMatch(/Impressions/i);
    expect(html).not.toMatch(/Growth %/i);
    expect(html).not.toMatch(/전부 자동/i);
  });

  it("ensures zero direct engine / ORM imports in renderer components", () => {
    const rendererDir = join(__dirname, "renderer");
    const files = getAllSourceFiles(rendererDir);

    const forbiddenRegex = /import\s+.*from\s+["']@clime\/(vault|event-bus|ai|storage|session)["']/g;
    const ormRegex = /import\s+.*from\s+["'](drizzle-orm|better-sqlite3)["']/g;

    for (const filePath of files) {
      const content = readFileSync(filePath, "utf8");
      expect(content, `File ${filePath} contains forbidden engine import`).not.toMatch(forbiddenRegex);
      expect(content, `File ${filePath} contains forbidden ORM import`).not.toMatch(ormRegex);
    }
  });
});
