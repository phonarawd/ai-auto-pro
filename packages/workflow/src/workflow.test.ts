import { describe, expect, it } from "vitest";
import { withSchemaVersion } from "@clime/shared";
import {
  createAndSeedSqliteStorage,
  SEED_IDS,
} from "@clime/storage";
import {
  assertDailyGrowthRequirements,
  createDailyGrowthDsl,
  createWorkflowEngine,
  checkTransition,
  canTransition,
  DAILY_GROWTH_TEMPLATE_ID,
  LEARN_NODE_TYPE,
  MEASURE_NODE_TYPE,
  PUBLISH_NODE_TYPE,
  VALIDATE_NODE_TYPE,
  validateTemplateDsl,
} from "./index.js";

describe("@clime/workflow DSL + Task SM", () => {
  it("Daily Growth DSL requires publish + validate + export + measure + learn", () => {
    const dsl = createDailyGrowthDsl();
    expect(dsl.id).toBe(DAILY_GROWTH_TEMPLATE_ID);
    expect(assertDailyGrowthRequirements(dsl).ok).toBe(true);
    expect(dsl.nodes.some((n) => n.type === PUBLISH_NODE_TYPE)).toBe(true);
    expect(dsl.nodes.some((n) => n.type === VALIDATE_NODE_TYPE)).toBe(true);
    expect(dsl.nodes.some((n) => n.type === MEASURE_NODE_TYPE)).toBe(true);
    expect(dsl.nodes.some((n) => n.type === LEARN_NODE_TYPE)).toBe(true);
    expect(dsl.edges).toContainEqual(["measure", "learn"]);

    const bad = {
      ...dsl,
      nodes: dsl.nodes.filter((n) => n.type !== VALIDATE_NODE_TYPE),
    };
    const rejected = validateTemplateDsl(bad);
    expect(rejected.ok).toBe(false);

    const noLearn = {
      ...dsl,
      nodes: dsl.nodes.filter((n) => n.type !== LEARN_NODE_TYPE),
    };
    expect(assertDailyGrowthRequirements(noLearn).ok).toBe(false);
  });

  it("rejects Validate-skip transitions (Validate skip = 0)", () => {
    expect(canTransition("RUNNING", "OPTIMIZING")).toBe(false);
    expect(canTransition("RUNNING", "PUBLISHED")).toBe(false);
    expect(canTransition("QUEUED", "PUBLISHED")).toBe(false);
    expect(checkTransition("RUNNING", "OPTIMIZING").ok).toBe(false);
    if (!checkTransition("RUNNING", "OPTIMIZING").ok) {
      expect(checkTransition("RUNNING", "OPTIMIZING").code).toBe("VALIDATE_SKIP");
    }
    expect(canTransition("RUNNING", "VALIDATING")).toBe(true);
    expect(canTransition("VALIDATING", "OPTIMIZING")).toBe(true);
  });

  it("optimistic lock: conflicting transitions — one winner", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const engine = createWorkflowEngine(storage);
      const created = await engine.createRun({
        projectId: SEED_IDS.emptyProject,
        templateId: DAILY_GROWTH_TEMPLATE_ID,
        traceId: "tr-lock-1",
      });
      expect(created.ok).toBe(true);
      if (!created.ok) throw new Error("create failed");

      const run = await engine.getRun(created.workflowRunId);
      expect(run?.version).toBe(1);

      const a = await engine.transition({
        workflowRunId: created.workflowRunId,
        to: "RUNNING",
        traceId: "tr-lock-a",
        expectedVersion: run!.version,
        expectedUpdatedAt: run!.updatedAt,
      });
      expect(a.ok).toBe(true);

      const b = await engine.transition({
        workflowRunId: created.workflowRunId,
        to: "CANCELLED",
        traceId: "tr-lock-b",
        expectedVersion: run!.version,
        expectedUpdatedAt: run!.updatedAt,
      });
      expect(b.ok).toBe(false);
      if (!b.ok) {
        expect(b.reason).toBe("conflict");
        expect(b.traceId).toBe("tr-lock-b");
      }

      const after = await engine.getRun(created.workflowRunId);
      expect(after?.state).toBe("RUNNING");
      expect(after?.version).toBe(2);
    } finally {
      storage.close();
    }
  });

  it("partial failure stops with FAILED + traceId — never PUBLISHED", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const engine = createWorkflowEngine(storage);
      const created = await engine.createRun({
        projectId: SEED_IDS.emptyProject,
        traceId: "tr-fail-1",
      });
      if (!created.ok) throw new Error("create failed");

      await engine.transition({
        workflowRunId: created.workflowRunId,
        to: "RUNNING",
        traceId: "tr-fail-1",
      });
      await engine.transition({
        workflowRunId: created.workflowRunId,
        to: "VALIDATING",
        traceId: "tr-fail-1",
      });

      const stopped = await engine.stopOnPartialFailure({
        workflowRunId: created.workflowRunId,
        nodeId: "validate",
        error: "brand rule violated",
        traceId: "tr-fail-stop",
      });
      expect(stopped.ok).toBe(true);
      if (stopped.ok) expect(stopped.to).toBe("FAILED");

      const run = await engine.getRun(created.workflowRunId);
      expect(run?.state).toBe("FAILED");
      expect(run?.state).not.toBe("PUBLISHED");
      expect(run?.cursorJson).toContain("tr-fail-stop");
      expect(run?.cursorJson).toContain("schema_version");
    } finally {
      storage.close();
    }
  });

  it("engine refuses createRun when Daily Growth lacks publish", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const engine = createWorkflowEngine(storage);
      const dsl = createDailyGrowthDsl();
      const bad = {
        ...dsl,
        nodes: dsl.nodes.filter((n) => n.type !== PUBLISH_NODE_TYPE),
      };
      const created = await engine.createRun({
        projectId: SEED_IDS.emptyProject,
        dsl: bad,
        traceId: "tr-bad-dsl",
      });
      expect(created.ok).toBe(false);
    } finally {
      storage.close();
    }
  });

  it("happy path SM advances only through VALIDATING", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    try {
      const engine = createWorkflowEngine(storage);
      const created = await engine.createRun({
        projectId: SEED_IDS.emptyProject,
        traceId: "tr-happy",
      });
      if (!created.ok) throw new Error("create failed");
      const id = created.workflowRunId;

      for (const to of [
        "RUNNING",
        "VALIDATING",
        "OPTIMIZING",
        "READY",
        "PUBLISHED",
      ] as const) {
        const r = await engine.transition({
          workflowRunId: id,
          to,
          traceId: "tr-happy",
        });
        expect(r.ok, `expected ${to}`).toBe(true);
      }
      const run = await engine.getRun(id);
      expect(run?.state).toBe("PUBLISHED");
      expect(run?.version).toBe(6);
    } finally {
      storage.close();
    }
  });

  it("rejects DSL missing schema_version", () => {
    const bad = withSchemaVersion({
      id: "x",
      name: "x",
      nodes: [{ id: "a", type: "t" }],
      edges: [] as [string, string][],
    });
    delete (bad as { schema_version?: number }).schema_version;
    // reconstruct without schema_version
    const result = validateTemplateDsl({
      id: "x",
      name: "x",
      nodes: [{ id: "a", type: "t" }],
      edges: [],
    });
    expect(result.ok).toBe(false);
  });
});
