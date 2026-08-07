/**
 * V1-A Product Loop Prove — research→decide→generate→Validate→publish→measure→learn
 * + START→Queue + publish ladder + vg-e + x-b retention.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { SCHEMA_VERSION } from "@clime/shared";
import {
  assertDailyGrowthRequirements,
  createDailyGrowthDsl,
  LEARN_NODE_TYPE,
  MEASURE_NODE_TYPE,
  PUBLISH_NODE_TYPE,
  VALIDATE_NODE_TYPE,
} from "@clime/workflow";
import { bootstrapDesktopDomainApi } from "./main/bootstrap-domain-api.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");

const REQUIRED_PROVES = [
  "docs/appendix/VGE_VIRAL_GROWTH_PROVE.md",
  "docs/appendix/XB_FORTIFICATION_PROVE.md",
  "docs/appendix/B3D_QUEUE_PROVE.md",
  "docs/appendix/C2D_PUBLISH_PROVE.md",
  "docs/appendix/ED_DECIDE_PROVE.md",
  "docs/appendix/JC_EXECUTIVE_PROVE.md",
  "docs/appendix/ID_LEARN_PROVE.md",
];

const GROWTH_PACKAGES = [
  "research",
  "planning",
  "decision",
  "revenue",
  "knowledge",
] as const;

function listGrowthDirs(): string[] {
  const root = join(repoRoot, "packages", "growth");
  return readdirSync(root).filter((name) => {
    const p = join(root, name);
    return statSync(p).isDirectory() && existsSync(join(p, "package.json"));
  });
}

describe("V1-A Product Loop Prove", () => {
  it("Daily Growth DSL connects research→…→Validate→publish→measure→learn", () => {
    const dsl = createDailyGrowthDsl();
    expect(assertDailyGrowthRequirements(dsl).ok).toBe(true);

    const types = dsl.nodes.map((n) => n.type);
    expect(types).toContain("growth.research.keyword_pass");
    expect(types).toContain("growth.decision.emit_daily");
    expect(types).toContain("content.generate");
    expect(types).toContain(VALIDATE_NODE_TYPE);
    expect(types).toContain(PUBLISH_NODE_TYPE);
    expect(types).toContain("content.export");
    expect(types).toContain(MEASURE_NODE_TYPE);
    expect(types).toContain(LEARN_NODE_TYPE);

    // Ordered edges for the product loop core
    expect(dsl.edges).toContainEqual(["research_keywords", "decide"]);
    expect(dsl.edges).toContainEqual(["generate", "validate"]);
    expect(dsl.edges).toContainEqual(["validate", "optimize"]);
    expect(dsl.edges).toContainEqual(["publish", "measure"]);
    expect(dsl.edges).toContainEqual(["measure", "learn"]);
  });

  it("START → Planner Queue only (no inline lease / worker)", async () => {
    const ipcMain = { handle: vi.fn() };
    const boot = bootstrapDesktopDomainApi(ipcMain);
    try {
      const res = await boot.host.handleIpcRequest(
        "domain:automation.startMission",
        {
          requestId: "req_v1a",
          schema_version: SCHEMA_VERSION,
          traceId: "tr_v1a_start",
          args: { missionId: "mission-v1a" },
        },
      );
      expect(res.ok).toBe(true);
      if (!res.ok) throw new Error("expected startMission ok");
      const data = res.data as {
        jobId: string;
        plannerQueueItemId?: string;
      };
      expect(data.jobId).toMatch(/^job_/);
      expect(data.plannerQueueItemId).toBeTruthy();

      const item = await boot.storage.plannerQueue.getById(
        data.plannerQueueItemId!,
      );
      expect(item?.status).toBe("ready");
      expect(item?.leasedBy).toBeNull();
      expect(boot.automation.governor.getActiveCount()).toBe(0);

      const runtimeSrc = readFileSync(
        join(repoRoot, "packages/automation/src/runtime.ts"),
        "utf8",
      );
      const startBlock = runtimeSrc.slice(
        runtimeSrc.indexOf("async startMission"),
        runtimeSrc.indexOf("stop()"),
      );
      expect(startBlock).not.toMatch(/leaseNext/);
      expect(startBlock).not.toMatch(/\.tick\(/);
    } finally {
      await boot.close();
    }
  });

  it("publish ladder + Capability Matrix channels exist", async () => {
    const ipcMain = { handle: vi.fn() };
    const boot = bootstrapDesktopDomainApi(ipcMain);
    try {
      const matrix = await boot.host.handleIpcRequest("domain:account.getMatrix", {
        requestId: "req_v1a_mx",
        schema_version: SCHEMA_VERSION,
        traceId: "tr_v1a_mx",
        args: {},
      });
      expect(matrix.ok).toBe(true);
      if (!matrix.ok) throw new Error("matrix");
      const data = matrix.data as {
        canPublish: boolean;
        publishMode?: string | null;
        riskLevel?: string;
      };
      expect(typeof data.canPublish).toBe("boolean");
      if (data.riskLevel !== undefined) {
        expect(["low", "medium", "high"]).toContain(data.riskLevel);
      }

      const ladder = readFileSync(
        join(repoRoot, "packages/browser-automation/src/ladder.ts"),
        "utf8",
      );
      expect(ladder).toMatch(/publishMode/);
      expect(ladder).toMatch(/PAUSED_CHALLENGE/);
      expect(ladder).toMatch(/posted_api|api/);
      expect(ladder).toMatch(/posted_session|session/);
    } finally {
      await boot.close();
    }
  });

  it("Decision owns daily; Executive week/month/quarter only", () => {
    const decision = readFileSync(
      join(repoRoot, "packages/growth/decision/src/engine.ts"),
      "utf8",
    );
    expect(decision).toMatch(/runDailyDecision|daily/);

    const executive = readFileSync(
      join(repoRoot, "packages/meta/src/executive.ts"),
      "utf8",
    );
    expect(executive).toMatch(/week|month|quarter/i);
    expect(executive).not.toMatch(/runDailyDecision/);
    expect(executive).not.toMatch(/enqueueMission/);
  });

  it("Growth umbrella is exactly five packages", () => {
    const dirs = listGrowthDirs().sort();
    expect(dirs).toEqual([...GROWTH_PACKAGES].sort());
  });

  it("vg-e and x-b prove stamps are GREEN", () => {
    for (const rel of REQUIRED_PROVES) {
      const abs = join(repoRoot, rel);
      expect(existsSync(abs), `missing ${rel}`).toBe(true);
      const body = readFileSync(abs, "utf8");
      expect(body, rel).toMatch(/\*?Status:\*?\*?\s*GREEN/i);
    }
  });

  it("Zero-Cost Viral Growth seats exist (paid API 0 path)", () => {
    expect(
      existsSync(
        join(repoRoot, "packages/growth/research/src/micro-audit-export.ts"),
      ),
    ).toBe(true);
    expect(
      existsSync(
        join(repoRoot, "packages/growth/research/src/multi-jack-pack.ts"),
      ),
    ).toBe(true);
    expect(
      existsSync(join(repoRoot, "packages/workflow/src/clime-playbook.ts")),
    ).toBe(true);
    expect(
      existsSync(join(repoRoot, "packages/content/src/channels.ts")),
    ).toBe(true);
    expect(existsSync(join(repoRoot, "packages/viral"))).toBe(false);
  });
});
