import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, withSchemaVersion } from "@clime/shared";
import {
  createAndSeedSqliteStorage,
  SEED_IDS,
} from "@clime/storage";
import {
  createFeatureManagement,
  executeIfAdmitted,
  serializePolicyRule,
  type SystemEventSink,
} from "./index.js";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("@clime/feature-management GovernanceAPI", () => {
  it("admits enabled seed features through Feature→Policy→Runtime", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const gov = createFeatureManagement({ storage });
      const decision = await gov.admit({
        featureKey: "feature.missionCenter.start",
        projectId: SEED_IDS.emptyProject,
        traceId: "tr-admit-ok",
      });
      expect(decision).toEqual({ ok: true, traceId: "tr-admit-ok" });
    } finally {
      storage.close();
    }
  });

  it("denies disabled features (feature.ads.spend)", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const gov = createFeatureManagement({ storage });
      const decision = await gov.admit({
        featureKey: "feature.ads.spend",
        projectId: SEED_IDS.emptyProject,
        traceId: "tr-ads",
      });
      expect(decision.ok).toBe(false);
      if (!decision.ok) {
        expect(decision.code).toBe("FEATURE_DISABLED");
        expect(decision.terminalHint).toBe("BLOCKED_POLICY");
      }
    } finally {
      storage.close();
    }
  });

  it("enforces publish_gate Validate before admit", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const gov = createFeatureManagement({ storage });
      const denied = await gov.admit({
        featureKey: "feature.publish.api",
        projectId: SEED_IDS.emptyProject,
        traceId: "tr-pub-deny",
        platformSideEffect: true,
        accountId: "acct-1",
      });
      expect(denied.ok).toBe(false);
      if (!denied.ok) {
        expect(denied.code).toBe("VALIDATION_FAILED");
      }

      const allowed = await gov.admit({
        featureKey: "feature.publish.api",
        projectId: SEED_IDS.emptyProject,
        traceId: "tr-pub-ok",
        platformSideEffect: true,
        accountId: "acct-1",
        validated: true,
      });
      expect(allowed.ok).toBe(true);
    } finally {
      storage.close();
    }
  });

  it("Kill Switch cancels workflow + leased queue and blocks admit", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    const events: Array<{ type: string; traceId: string }> = [];
    const sink: SystemEventSink = {
      emit(event) {
        events.push({ type: event.type, traceId: event.traceId });
      },
    };

    try {
      const gov = createFeatureManagement({ storage, events: sink });
      const projectId = SEED_IDS.emptyProject;

      const { id: queueId } = await storage.plannerQueue.enqueue({
        projectId,
        priority: 1,
        deadline: null,
        expectedRoi: null,
        dependencyIdsJson: JSON.stringify(
          withSchemaVersion({ ids: [] as string[] }),
        ),
        retryCount: 0,
        humanApproval: 0,
        decisionId: null,
        missionId: null,
        payloadJson: JSON.stringify(
          withSchemaVersion({ data: { kind: "test" } }),
        ),
        status: "ready",
        leasedBy: null,
        leasedAt: null,
        leaseExpiresAt: null,
      });
      expect(
        await storage.plannerQueue.lease(
          queueId,
          "worker-1",
          new Date().toISOString(),
          new Date(Date.now() + 30_000).toISOString(),
        ),
      ).toBe(true);

      const { id: runId } = await storage.workflowRuns.create({
        projectId,
        queueItemId: queueId,
        missionId: null,
        decisionId: null,
        dslJson: JSON.stringify(
          withSchemaVersion({ data: { nodes: [] as unknown[] } }),
        ),
        state: "RUNNING",
        cursorJson: null,
        traceId: "tr-run-1",
      });

      const cancelled = await gov.activateKillSwitch({
        scope: "global",
        scopeId: null,
        reason: "operator halt",
        traceId: "tr-kill",
        projectId,
        actor: "owner",
      });

      expect(cancelled.cancelledWorkflowRunIds).toContain(runId);
      expect(cancelled.cancelledQueueItemIds).toContain(queueId);

      const run = await storage.workflowRuns.getById(runId);
      expect(run?.state).toBe("CANCELLED");
      const queue = await storage.plannerQueue.getById(queueId);
      expect(queue?.status).toBe("cancelled");

      expect(events.some((e) => e.type === "KillSwitchActivated")).toBe(true);

      const blocked = await gov.admit({
        featureKey: "feature.missionCenter.start",
        projectId,
        traceId: "tr-after-kill",
      });
      expect(blocked.ok).toBe(false);
      if (!blocked.ok) {
        expect(blocked.code).toBe("KILL_SWITCH");
        expect(blocked.terminalHint).toBe("CANCELLED");
      }

      await gov.clearKillSwitch({
        scope: "global",
        scopeId: null,
        traceId: "tr-clear",
      });
      expect(events.some((e) => e.type === "KillSwitchCleared")).toBe(true);

      const afterClear = await gov.admit({
        featureKey: "feature.missionCenter.start",
        projectId,
        traceId: "tr-resume",
      });
      expect(afterClear.ok).toBe(true);
    } finally {
      storage.close();
    }
  });

  it("executeIfAdmitted refuses side effects when Runtime denies (미통과 실행 0)", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const gov = createFeatureManagement({ storage });
      let executed = 0;

      const denied = await executeIfAdmitted(
        gov,
        {
          featureKey: "feature.ads.spend",
          projectId: SEED_IDS.emptyProject,
          traceId: "tr-gate-deny",
        },
        () => {
          executed += 1;
          return "should-not-run";
        },
      );
      expect(denied.admitted).toBe(false);
      expect(executed).toBe(0);

      const allowed = await executeIfAdmitted(
        gov,
        {
          featureKey: "feature.content.generate",
          projectId: SEED_IDS.emptyProject,
          traceId: "tr-gate-ok",
        },
        () => {
          executed += 1;
          return "ran";
        },
      );
      expect(allowed.admitted).toBe(true);
      if (allowed.admitted) {
        expect(allowed.result).toBe("ran");
      }
      expect(executed).toBe(1);
    } finally {
      storage.close();
    }
  });

  it("mutations go through GovernanceAPI and persist FeatureState/PolicyRule", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const gov = createFeatureManagement({ storage });

      await gov.setFeature({
        featureKey: "feature.export.backup",
        scope: "project",
        scopeId: SEED_IDS.emptyProject,
        lifecycle: "disabled",
        traceId: "tr-set-feature",
        actor: "owner",
      });

      const views = await gov.getFeatures({
        scope: "project",
        scopeId: SEED_IDS.emptyProject,
      });
      expect(
        views.find((v) => v.featureKey === "feature.export.backup")?.lifecycle,
      ).toBe("disabled");

      const projectDeny = await gov.admit({
        featureKey: "feature.export.backup",
        projectId: SEED_IDS.emptyProject,
        traceId: "tr-proj-deny",
      });
      expect(projectDeny.ok).toBe(false);

      const ruleJson = serializePolicyRule({
        kind: "governor_limits",
        maxConcurrentRuns: 1,
      });
      expect(JSON.parse(ruleJson).schema_version).toBe(SCHEMA_VERSION);

      await gov.setPolicy({
        featureKey: "feature.workflow.execute",
        scope: "global",
        scopeId: null,
        ruleJson,
        enabled: true,
        traceId: "tr-set-policy",
      });

      const { id: runA } = await storage.workflowRuns.create({
        projectId: SEED_IDS.emptyProject,
        queueItemId: null,
        missionId: null,
        decisionId: null,
        dslJson: JSON.stringify(
          withSchemaVersion({ data: { nodes: [] as unknown[] } }),
        ),
        state: "RUNNING",
        cursorJson: null,
        traceId: "tr-run-a",
      });
      expect(runA).toBeTruthy();

      const throttled = await gov.admit({
        featureKey: "feature.workflow.execute",
        projectId: SEED_IDS.emptyProject,
        traceId: "tr-throttle",
      });
      expect(throttled.ok).toBe(false);
      if (!throttled.ok) {
        expect(throttled.code).toBe("GOVERNOR_THROTTLED");
      }

      const status = await gov.getRuntimeStatus({
        projectId: SEED_IDS.emptyProject,
      });
      expect(status.schema_version).toBe(1);
      expect(status.activeRunCount).toBeGreaterThanOrEqual(1);
      expect(status.killSwitchActive).toBe(false);
    } finally {
      storage.close();
    }
  });

  it("package boundary: no drizzle/sqlite/prisma/supabase deps", () => {
    const pkg = JSON.parse(
      readFileSync(join(pkgRoot, "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(deps["drizzle-orm"]).toBeUndefined();
    expect(deps["better-sqlite3"]).toBeUndefined();
    expect(deps["@prisma/client"]).toBeUndefined();
    expect(deps["prisma"]).toBeUndefined();
    expect(deps["@supabase/supabase-js"]).toBeUndefined();
    expect(deps["@clime/storage"]).toBe("workspace:*");
    expect(deps["@clime/shared"]).toBe("workspace:*");
  });
});
