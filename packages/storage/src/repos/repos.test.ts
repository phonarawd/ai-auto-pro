import { describe, expect, it } from "vitest";
import {
  publishingHistoryKindSchema,
  SCHEMA_VERSION,
  withSchemaVersion,
} from "@clime/shared";
import { createAndSeedSqliteStorage, createSqliteStorage } from "./create-sqlite-storage.js";
import {
  DEFAULT_FEATURES,
  EMPTY_PROJECT_NAME,
  SEED_IDS,
  SEED_MARKER_KEY,
} from "../seed/defaults.js";
import { envelopeJson } from "./helpers.js";

describe("@clime/storage Sqlite*Repository + seed", () => {
  it("createSqliteStorage wires all ClimeStorage ports", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const keys: Array<keyof typeof storage> = [
        "projects",
        "settings",
        "accounts",
        "connectors",
        "modules",
        "missions",
        "decisions",
        "plannerQueue",
        "workflowRuns",
        "content",
        "knowledge",
        "eventOutbox",
        "analytics",
        "features",
        "policies",
        "audit",
        "learning",
        "goals",
      ];
      for (const key of keys) {
        expect(storage[key]).toBeTypeOf("object");
      }
      expect(storage.runAtomicWrite).toBeTypeOf("function");

    } finally {
      storage.close();
    }
  });

  it("seeds empty project + default Feature/Policy (idempotent)", async () => {
    const { storage, seed } = await createAndSeedSqliteStorage({
      path: ":memory:",
    });
    try {
      expect(seed.alreadySeeded).toBe(false);
      expect(seed.emptyProjectId).toBe(SEED_IDS.emptyProject);
      expect(seed.featureCount).toBe(DEFAULT_FEATURES.length);

      const project = await storage.projects.getById(SEED_IDS.emptyProject);
      expect(project).not.toBeNull();
      expect(project?.name).toBe(EMPTY_PROJECT_NAME);

      const missions = await storage.missions.listByDate(
        SEED_IDS.emptyProject,
        "2026-08-07",
      );
      expect(missions).toHaveLength(0);

      const start = await storage.features.get(
        "feature.missionCenter.start",
        "global",
        null,
      );
      expect(start?.lifecycle).toBe("enabled");

      const ads = await storage.features.get(
        "feature.ads.spend",
        "global",
        null,
      );
      expect(ads?.lifecycle).toBe("disabled");

      const features = await storage.features.list("global", null);
      expect(features).toHaveLength(DEFAULT_FEATURES.length);

      const rules = await storage.policies.listRules("global", null);
      expect(rules.length).toBeGreaterThanOrEqual(2);
      for (const rule of rules) {
        const parsed = JSON.parse(rule.ruleJson) as { schema_version: number };
        expect(parsed.schema_version).toBe(SCHEMA_VERSION);
      }

      const kill = await storage.policies.getKillSwitch("global", null);
      expect(kill?.active).toBe(0);

      const marker = await storage.settings.getGlobal(SEED_MARKER_KEY);
      expect(marker).not.toBeNull();

      const again = await storage.seedDefaults();
      expect(again.alreadySeeded).toBe(true);
      const featuresAgain = await storage.features.list("global", null);
      expect(featuresAgain).toHaveLength(DEFAULT_FEATURES.length);
    } finally {
      storage.close();
    }
  });

  it("rejects JSON writes missing schema_version", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({
        name: "p",
      });
      await expect(
        storage.missions.create({
          projectId,
          missionDate: "2026-08-07",
          title: "t",
          status: "open",
          priority: 1,
          decisionId: null,
          payloadJson: JSON.stringify({ no_version: true }),
        }),
      ).rejects.toThrow();
    } finally {
      storage.close();
    }
  });

  it("project / mission / workflow / content / history round-trip", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({
        name: "Roundtrip",
      });
      await storage.projects.update(projectId, {
        metaJson: envelopeJson({ note: "hi" }),
      });
      const p = await storage.projects.getById(projectId);
      expect(p?.metaJson).toContain("schema_version");

      const { id: missionId } = await storage.missions.create({
        projectId,
        missionDate: "2026-08-07",
        title: "Today",
        status: "open",
        priority: 1,
        decisionId: null,
        payloadJson: envelopeJson({ why: "decision" }),
      });

      const { id: runId } = await storage.workflowRuns.create({
        projectId,
        queueItemId: null,
        missionId,
        decisionId: null,
        dslJson: envelopeJson({ nodes: ["research", "publish"] }),
        state: "QUEUED",
        cursorJson: null,
        traceId: "tr_1",
      });
      await storage.workflowRuns.transition(runId, "RUNNING");
      const run = await storage.workflowRuns.getById(runId);
      expect(run?.state).toBe("RUNNING");

      const { id: contentId } = await storage.content.createItem({
        projectId,
        workflowRunId: runId,
        targetAccountId: null,
        channel: "x",
        format: "text",
        status: "draft",
        artifactRef: null,
        metaJson: envelopeJson({}),
      });

      publishingHistoryKindSchema.parse("export");
      await storage.content.appendHistory({
        projectId,
        contentItemId: contentId,
        accountId: null,
        kind: "export",
        publishMode: null,
        exportPath: "Exports/2026-08-07/x.json",
        externalPostId: null,
        metaJson: envelopeJson({ backup: true }),
        occurredAt: new Date().toISOString(),
      });
      const history = await storage.content.listHistory(projectId, 10);
      expect(history).toHaveLength(1);
      expect(history[0]?.kind).toBe("export");
    } finally {
      storage.close();
    }
  });

  it("planner queue lease is exclusive", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "Q" });
      const { id } = await storage.plannerQueue.enqueue({
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
        payloadJson: envelopeJson({}),
        status: "ready",
        leasedBy: null,
        leasedAt: null,
        leaseExpiresAt: null,
      });
      const at = new Date().toISOString();
      const expires = new Date(Date.now() + 30_000).toISOString();
      expect(await storage.plannerQueue.lease(id, "w1", at, expires)).toBe(true);
      expect(await storage.plannerQueue.lease(id, "w2", at, expires)).toBe(false);
    } finally {
      storage.close();
    }
  });

  it("settings / knowledge / outbox / capability Zod boundaries", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "S" });
      await storage.settings.putUserPrefs("local", envelopeJson({ theme: "light" }));
      await storage.settings.putGlobal("locale", envelopeJson({ lang: "ko" }));
      await storage.settings.putProject(
        projectId,
        "timezone",
        envelopeJson({ tz: "Asia/Seoul" }),
      );
      expect((await storage.settings.getUserPrefs("local"))?.prefsJson).toContain(
        "schema_version",
      );

      await storage.knowledge.upsert({
        projectId,
        namespace: "strategy",
        type: "playbook",
        tagsJson: JSON.stringify(withSchemaVersion({ tags: ["v1"] })),
        body: envelopeJson({ title: "baseline" }),
        blobRef: null,
        evolutionJson: null,
      });
      const items = await storage.knowledge.list(projectId, {
        namespace: "strategy",
      });
      expect(items).toHaveLength(1);

      await storage.eventOutbox.enqueue({
        projectId,
        type: "domain.test",
        payloadJson: envelopeJson({ ok: true }),
        traceId: "tr_out",
        occurredAt: new Date().toISOString(),
        status: "pending",
      });
      const pending = await storage.eventOutbox.listPending(5);
      expect(pending).toHaveLength(1);

      const { id: accountId } = await storage.accounts.createAccount({
        projectId,
        platform: "stub",
        displayName: "Stub",
        externalId: null,
        status: "connected",
        routerTagsJson: null,
      });
      await storage.accounts.upsertCapability({
        accountId,
        canPublish: 1,
        publishMode: "api",
        riskLevel: "low",
        flagsJson: envelopeJson({}),
        snapshotAt: new Date().toISOString(),
      });
      const cap = await storage.accounts.getCapability(accountId);
      expect(cap?.canPublish).toBe(1);
      expect(cap?.publishMode).toBe("api");
    } finally {
      storage.close();
    }
  });
});
