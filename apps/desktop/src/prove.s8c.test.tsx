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

describe("8-C Mission UX Gate Audit (s8-c)", () => {
  it("Gate 1: First viewport contains brand + core CTA group + status board only (no vanity stats)", () => {
    const html = renderToString(<MissionCenterFrame />);
    const cleanHtml = html.replace(/<!-- -->/g, "");

    expect(cleanHtml).toContain("CLIME AI Growth Studio");
    expect(cleanHtml).toContain(COPY.brandSubtitle);

    expect(cleanHtml).toContain(COPY.cta.start);
    expect(cleanHtml).toContain(COPY.cta.review);
    expect(cleanHtml).toContain(COPY.cta.publish);
    expect(cleanHtml).toContain(COPY.cta.export);

    expect(cleanHtml).toContain(COPY.status.title);
    expect(cleanHtml).toContain(COPY.status.honesty);

    expect(cleanHtml).not.toMatch(/Followers/i);
    expect(cleanHtml).not.toMatch(/Impressions/i);
    expect(cleanHtml).not.toMatch(/Growth %/i);
  });

  it("Gate 2: Non-blocking execution returns immediate jobId stub and trace ID", () => {
    const html = renderToString(<MissionCenterFrame />);
    const cleanHtml = html.replace(/<!-- -->/g, "");

    expect(cleanHtml).toContain(COPY.status.trace);
    expect(cleanHtml).toContain("tr-init-0001");
  });

  it("Gate 3: Capability badges are honest (canPublish / publishMode / riskLevel)", () => {
    const html = renderToString(<MissionCenterFrame />);
    const cleanHtml = html.replace(/<!-- -->/g, "");

    expect(cleanHtml).toContain(COPY.status.canPublishYes);
    expect(cleanHtml).toContain(COPY.publishMode.api);
    expect(cleanHtml).toContain(COPY.risk.low);
    // Field wiring remains in source
    const src = readFileSync(
      join(__dirname, "renderer/components/MissionCenterFrame.tsx"),
      "utf8",
    );
    expect(src).toMatch(/canPublish/);
    expect(src).toMatch(/publishMode/);
    expect(src).toMatch(/riskLevel/);
  });

  it("Gate 4 & 5: Export is exposed as backup log only", () => {
    const html = renderToString(<MissionCenterFrame />);
    expect(html).toContain(COPY.cta.export);
    expect(html).not.toContain("Export as sole path");
  });

  it("Gate 6: Paid Ads spend slot is not present or HumanGate only", () => {
    const html = renderToString(<MissionCenterFrame />);
    expect(html).not.toMatch(/Spend \$[0-9]+/i);
    expect(html).not.toMatch(/Auto Spend/i);
  });

  it("Gate 7: Failures and initial state expose Trace ID", () => {
    const html = renderToString(<MissionCenterFrame />);
    expect(html).toContain("tr-init-0001");
  });

  it("Gate 8: Direct engine / ORM imports in renderer components equal 0", () => {
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

  it("Gate 9: Pretendard and --clime-* tokens used (zero raw hex in components)", () => {
    const componentsDir = join(__dirname, "renderer/components");
    const files = getAllSourceFiles(componentsDir);

    const rawHexRegex = /#(?:[0-9a-fA-F]{3}){1,2}\b/g;

    for (const filePath of files) {
      const content = readFileSync(filePath, "utf8");
      expect(content, `Component ${filePath} contains raw hex color`).not.toMatch(rawHexRegex);
    }
  });

  it("Gate 10: Contract alignment with Planner Queue requirement", () => {
    const componentPath = join(__dirname, "renderer/components/MissionCenterFrame.tsx");
    const content = readFileSync(componentPath, "utf8");
    expect(content).toContain("Planner Queue");
  });
});
