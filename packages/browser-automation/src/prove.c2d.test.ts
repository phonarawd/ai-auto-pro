import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createStubBrowserDriver } from "./browser-driver.js";
import { createPublishLadder } from "./ladder.js";
import type { PublishAccountPort, PublishContentPort } from "./ports.js";
import { createSessionSandbox } from "./session-sandbox.js";

function listTsFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTsFiles(full));
    else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")))
      out.push(full);
  }
  return out;
}

describe("C2-D Publish Prove", () => {
  it("workflow Daily Growth DSL source still requires account.publish (+ export backup)", () => {
    const dslPath = join(process.cwd(), "..", "workflow", "src", "dsl.ts");
    const src = readFileSync(dslPath, "utf8");
    expect(src).toContain('PUBLISH_NODE_TYPE = "account.publish"');
    expect(src).toContain('EXPORT_NODE_TYPE = "content.export"');
    expect(src).toMatch(/assertDailyGrowthRequirements/);
    expect(src).toMatch(/types\.has\(PUBLISH_NODE_TYPE\)/);
  });

  it("API + session paths write distinct posted_* kinds; challenge writes none", async () => {
    const history: string[] = [];
    const content: PublishContentPort = {
      async getArtifact(id) {
        return {
          id,
          projectId: "p",
          status: "validated",
          body: "body",
        };
      },
      async appendPostedHistory(input) {
        history.push(input.kind);
        return { ok: true, id: "h" };
      },
    };
    const apiAccount: PublishAccountPort = {
      getMatrix: () => ({
        canPublish: true,
        publishMode: "api",
        riskLevel: "low",
        platform: "x",
      }),
      markChallenge: () => undefined,
    };
    const sessionAccount: PublishAccountPort = {
      getMatrix: () => ({
        canPublish: true,
        publishMode: "session",
        riskLevel: "medium",
        platform: "naver",
      }),
      markChallenge: () => undefined,
    };

    const apiLadder = createPublishLadder({ content, account: apiAccount });
    const apiRes = await apiLadder.publish({
      projectId: "p",
      contentItemId: "c",
      accountId: "a1",
      traceId: "t1",
    });
    expect(apiRes.ok).toBe(true);

    const sessionLadder = createPublishLadder({
      content,
      account: sessionAccount,
      delay: async () => undefined,
      sampleJitterMs: () => 5_000,
      sandbox: createSessionSandbox(),
    });
    const sessionRes = await sessionLadder.publish({
      projectId: "p",
      contentItemId: "c",
      accountId: "a2",
      traceId: "t2",
      skipJitter: true,
    });
    expect(sessionRes.ok).toBe(true);

    const challengeLadder = createPublishLadder({
      content,
      account: sessionAccount,
      browserDriver: createStubBrowserDriver({ alwaysChallenge: true }),
      delay: async () => undefined,
    });
    const before = history.length;
    const ch = await challengeLadder.publish({
      projectId: "p",
      contentItemId: "c",
      accountId: "a3",
      traceId: "t3",
      skipJitter: true,
    });
    expect(ch.ok).toBe(false);
    if (!ch.ok) expect(ch.code).toBe("PAUSED_CHALLENGE");
    expect(history.slice(before)).toEqual([]);
    expect(history).toEqual(["posted_api", "posted_session"]);
  });

  it("Export backup path in content never writes posted_* (Export ≠ sole success)", () => {
    const exportSrc = readFileSync(
      join(process.cwd(), "..", "content", "src", "export-pack.ts"),
      "utf8",
    );
    expect(exportSrc).not.toMatch(/posted_api|posted_session/);
    const engineSrc = readFileSync(
      join(process.cwd(), "..", "content", "src", "engine.ts"),
      "utf8",
    );
    // exportPack history kind is export only
    expect(engineSrc).toMatch(/kind:\s*kind\.kind/);
    expect(engineSrc).toMatch(/parseHistoryKind\("export"\)|parseHistoryKind\('export'\)/);
  });

  it("zero bypass / captcha-solve CTA strings in BAE + desktop UI surfaces", () => {
    const roots = [
      join(process.cwd(), "src"),
      join(process.cwd(), "..", "..", "apps", "desktop", "src", "renderer"),
    ];
    const forbidden = [
      /우회\s*CTA|캡차\s*우회|자동\s*우회/,
      /solveCaptcha\s*\(/i,
      /bypassCaptcha\s*\(/i,
      /bypassChallenge\s*\(/i,
      /from\s+["'][^"']*2captcha/i,
      /from\s+["'][^"']*anticaptcha/i,
      /label:\s*["'][^"']*우회/,
      /label:\s*["'][^"']*bypass/i,
    ];
    for (const root of roots) {
      for (const file of listTsFiles(root)) {
        if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
        const src = readFileSync(file, "utf8");
        for (const pattern of forbidden) {
          expect(src, `${file} matched ${pattern}`).not.toMatch(pattern);
        }
      }
    }
  });
});
