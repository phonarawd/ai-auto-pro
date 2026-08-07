import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { SCHEMA_VERSION } from "@clime/shared";
import type { GovernanceAPI } from "@clime/feature-management";
import { buildDomainChannel, parseDomainChannel } from "./ipc/channel.js";
import { createDomainHost } from "./host/create-host.js";
import { NAMESPACE_METHOD_METADATA } from "./namespaces/types.js";

const here = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(here, "..", "package.json");

const ASYNC_METHODS: Array<{ ns: string; method: string }> = [];
for (const [ns, methods] of Object.entries(NAMESPACE_METHOD_METADATA)) {
  for (const [method, meta] of Object.entries(methods)) {
    if (meta.kind === "A") {
      ASYNC_METHODS.push({ ns, method });
    }
  }
}

describe("s3-e Domain/Buses Prove", () => {
  it("uses single channel notation domain:<namespace>.<method> — rejects domain. prefix", () => {
    expect(buildDomainChannel("growth", "getMissionToday")).toBe("domain:growth.getMissionToday");
    expect(parseDomainChannel("domain:growth.getMissionToday")).not.toBeNull();

    // Forbidden historical/dot-prefix forms
    expect(parseDomainChannel("domain.growth.getMissionToday")).toBeNull();
    expect(parseDomainChannel("domain.growth")).toBeNull();
    expect(parseDomainChannel("growth.getMissionToday")).toBeNull();
  });

  it("registers exactly the frozen §5 method map (14 namespaces)", () => {
    const namespaces = Object.keys(NAMESPACE_METHOD_METADATA);
    expect(namespaces).toHaveLength(14);

    const channels = namespaces.flatMap((ns) =>
      Object.keys(NAMESPACE_METHOD_METADATA[ns]!).map((method) => buildDomainChannel(ns, method)),
    );

    // C2 adds account.publish → 85; Phase D → 88; Phase E adds
    // estimateRevenue / prioritizeRevenue / runDailyDecision → 91;
    // Phase F adds getBrandRules / setBrandRules → 93;
    // Phase G adds 7 research-depth methods → 100;
    // VG adds exportMicroAuditViral + buildMultiJackPack +
    // exportClimePlaybook + importClimePlaybook → 104;
    // Phase I: memory.recordEpisode + learning.proposeFromRoi +
    // learning.runReflection → 107;
    // Phase J: executive.linkMission + executive.getGoalChain → 109;
    // Phase K1: growth.getPersonaPrefs + growth.setPersonaPrefs → 111.
    expect(channels).toHaveLength(111);
    expect(channels.every((c) => c.startsWith("domain:") && !c.startsWith("domain."))).toBe(true);
    expect(new Set(channels).size).toBe(111);
    expect(channels).toContain("domain:executive.linkMission");
    expect(channels).toContain("domain:executive.getGoalChain");
    expect(channels).toContain("domain:account.publish");
    expect(channels).toContain("domain:growth.generateTopic");
    expect(channels).toContain("domain:growth.buildMultiJackHook");
    expect(channels).toContain("domain:growth.getNormalizedTrends");
    expect(channels).toContain("domain:growth.estimateRevenue");
    expect(channels).toContain("domain:growth.prioritizeRevenue");
    expect(channels).toContain("domain:growth.runDailyDecision");
    expect(channels).toContain("domain:growth.runMicroAudit");
    expect(channels).toContain("domain:growth.analyzeGap");
    expect(channels).toContain("domain:growth.analyzeViral");
    expect(channels).toContain("domain:growth.exportMicroAuditViral");
    expect(channels).toContain("domain:growth.buildMultiJackPack");
    expect(channels).toContain("domain:growth.getPersonaPrefs");
    expect(channels).toContain("domain:growth.setPersonaPrefs");
    expect(channels).toContain("domain:settings.getGlobal");
    expect(channels).toContain("domain:knowledge.list");
    expect(channels).toContain("domain:workflow.exportClimePlaybook");
    expect(channels).toContain("domain:workflow.importClimePlaybook");
  });

  it("requires IPC envelope requestId + schema_version + traceId", async () => {
    const host = createDomainHost();
    const res = await host.handleIpcRequest("domain:growth.getMissionToday", {
      requestId: "req_prove_env",
      // missing schema_version + traceId
      args: {},
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("VALIDATION_FAILED");
    }
  });

  it("returns AsyncJobAck jobId immediately for every [A] method", async () => {
    // C2 adds account.publish [A] → 8; Phase G runResearcherJob [A] → 9.
    expect(ASYNC_METHODS.length).toBe(9);
    expect(ASYNC_METHODS.some((m) => m.ns === "account" && m.method === "publish")).toBe(true);
    expect(ASYNC_METHODS.some((m) => m.ns === "growth" && m.method === "runResearcherJob")).toBe(
      true,
    );
    const host = createDomainHost();

    for (const { ns, method } of ASYNC_METHODS) {
      const channel = buildDomainChannel(ns, method);
      const res = await host.handleIpcRequest(channel, {
        requestId: `req_${ns}_${method}`,
        schema_version: SCHEMA_VERSION,
        traceId: `trace_${ns}_${method}`,
        args: {},
      });

      expect(res.ok, channel).toBe(true);
      if (res.ok) {
        const ack = res.data as { jobId: string; traceId: string; schema_version: number };
        expect(ack.jobId, channel).toMatch(/^job_/);
        expect(ack.traceId, channel).toBe(`trace_${ns}_${method}`);
        expect(ack.schema_version, channel).toBe(SCHEMA_VERSION);
      }
    }
  });

  it("automation.startMission ack includes plannerQueueItemId (Queue path, no bypass API)", async () => {
    const host = createDomainHost();
    const res = await host.handleIpcRequest("domain:automation.startMission", {
      requestId: "req_start",
      schema_version: SCHEMA_VERSION,
      traceId: "trace_start",
      args: { templateId: "tmpl_1" },
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      const ack = res.data as { jobId: string; plannerQueueItemId?: string };
      expect(ack.jobId).toMatch(/^job_/);
      expect(ack.plannerQueueItemId).toBeTruthy();
    }

    // No alternate START / worker-bypass channel in the frozen map
    const allMethods = Object.values(NAMESPACE_METHOD_METADATA).flatMap((m) => Object.keys(m));
    expect(allMethods.some((m) => /bypass|runWorkerDirect|skipQueue/i.test(m))).toBe(false);
  });

  it("rejects invalid channel formats at host boundary", async () => {
    const host = createDomainHost();
    const res = await host.handleIpcRequest("domain.growth.getMissionToday", {
      requestId: "req_bad_ch",
      schema_version: SCHEMA_VERSION,
      traceId: "trace_bad_ch",
      args: {},
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("NOT_FOUND");
    }
  });

  it("governance.* wraps S25A GovernanceAPI mutations when full API is injected", async () => {
    const setFeature = vi.fn().mockResolvedValue({ id: "feat_1" });
    const activateKillSwitch = vi.fn().mockResolvedValue({
      cancelledWorkflowRunIds: [],
      cancelledQueueItemIds: [],
    });
    const admit = vi.fn().mockResolvedValue({ ok: true, traceId: "trace_gov" });

    const governanceAPI = {
      admit,
      getFeatures: vi.fn().mockResolvedValue([]),
      getPolicies: vi.fn().mockResolvedValue([]),
      getKillSwitch: vi.fn().mockResolvedValue(null),
      getRuntimeStatus: vi.fn().mockResolvedValue({ status: "operational" }),
      setFeature,
      setPolicy: vi.fn().mockResolvedValue({ id: "pol_1" }),
      activateKillSwitch,
      clearKillSwitch: vi.fn().mockResolvedValue(undefined),
    } as unknown as GovernanceAPI;

    const host = createDomainHost({ governanceAPI });

    const setRes = await host.handleIpcRequest("domain:governance.setFeature", {
      requestId: "req_set_feat",
      schema_version: SCHEMA_VERSION,
      traceId: "trace_gov",
      args: {
        featureKey: "feature.missionCenter.start",
        scope: "global",
        lifecycle: "ga",
      },
    });

    expect(setRes.ok).toBe(true);
    expect(setFeature).toHaveBeenCalledWith(
      expect.objectContaining({
        featureKey: "feature.missionCenter.start",
        traceId: "trace_gov",
      }),
    );

    const killRes = await host.handleIpcRequest("domain:governance.activateKillSwitch", {
      requestId: "req_kill",
      schema_version: SCHEMA_VERSION,
      traceId: "trace_gov",
      args: { scope: "global", reason: "prove" },
    });

    expect(killRes.ok).toBe(true);
    expect(activateKillSwitch).toHaveBeenCalled();
    // Mutations still pass admit gate
    expect(admit).toHaveBeenCalled();
  });

  it("dependency law: no event-bus / drizzle / prisma / supabase in @clime/domain-api", () => {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    expect(deps["@clime/event-bus"]).toBeUndefined();
    expect(deps["drizzle-orm"]).toBeUndefined();
    expect(deps["better-sqlite3"]).toBeUndefined();
    expect(deps.prisma).toBeUndefined();
    expect(deps["@prisma/client"]).toBeUndefined();
    expect(deps["@supabase/supabase-js"]).toBeUndefined();

    expect(deps["@clime/shared"]).toBeTruthy();
    expect(deps["@clime/feature-management"]).toBeTruthy();
    expect(deps["@clime/observability"]).toBeTruthy();
    expect(deps.zod).toBeTruthy();
  });
});
