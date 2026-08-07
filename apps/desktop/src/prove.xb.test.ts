/**
 * X-B Fortification Cross-Prove — recheck x-a 6 categories before v1-a.
 * Prove only: no new features; stamp GREEN against XA_FORTIFICATION_CONTRACT.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createAnalyticsEngine } from "@clime/analytics";
import { DEFAULT_MAX_CONCURRENT_WORKERS } from "@clime/automation";
import {
  createSessionSandbox,
  DEFAULT_DAILY_PUBLISH_QUOTA,
  JITTER_MAX_MS,
  JITTER_MIN_MS,
  sampleGaussianJitterMs,
} from "@clime/browser-automation";
import { NAMESPACE_METHOD_METADATA } from "@clime/domain-api";
import {
  createSqliteStorage,
  withSchemaVersion,
} from "@clime/storage";

const here = dirname(fileURLToPath(import.meta.url));
const desktopRoot = join(here, "..");
const repoRoot = join(desktopRoot, "..", "..");

const OWNER_PROVES: { id: string; path: string }[] = [
  { id: "s2-e-c", path: "docs/appendix/S2EC_STORAGE_HARDENING_PROVE.md" },
  { id: "b3-d", path: "docs/appendix/B3D_QUEUE_PROVE.md" },
  { id: "c2-d", path: "docs/appendix/C2D_PUBLISH_PROVE.md" },
  { id: "f-c", path: "docs/appendix/FC_TRUST_PROVE.md" },
  { id: "s3-e", path: "docs/appendix/S3E_DOMAIN_API_PROVE.md" },
  { id: "s2.5-c", path: "docs/appendix/S25C_GOVERNANCE_PROVE.md" },
  { id: "s4-d", path: "docs/appendix/S4D_SECRETS_PROVE.md" },
  { id: "h-c", path: "docs/appendix/HC_PLANNING_EXPERIMENT_PROVE.md" },
  { id: "s4.5-c", path: "docs/appendix/S45C_AI_PROVE.md" },
  { id: "b1-d", path: "docs/appendix/B1D_ACCOUNT_PROVE.md" },
];

const BYPASS_IMPL = [
  /\bfunction\s+solveCaptcha\b/i,
  /\bsolveCaptcha\s*\(/,
  /\bfingerprintSpoof\b/,
  /\bproxyIdentityLaunder\b/,
  /\blaunderProxy\b/i,
];

const FORBIDDEN_DEPS = new Set([
  "prisma",
  "@prisma/client",
  "@supabase/supabase-js",
  "@supabase/ssr",
  "postgres",
  "pg",
]);

/** Split literals so this prove file is not flagged as a second WAL/mutex layer. */
const JM = "journal_mode";
const WAL = "WAL";
const BEGIN_IMM = "BEGIN" + " IMMEDIATE";
const CLASS_MUTEX = "class " + "AsyncMutex";
const CLASS_GATE = "class " + "WriteGate";
const JOURNAL_WAL_RE = new RegExp(JM + String.raw`\s*=\s*` + WAL);

function hasHardeningLeak(src: string): boolean {
  if (JOURNAL_WAL_RE.test(src)) return true;
  if (src.includes(BEGIN_IMM)) return true;
  if (src.includes(CLASS_MUTEX) || src.includes(CLASS_GATE)) return true;
  return false;
}

function walkTs(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (
      name === "node_modules" ||
      name === "dist" ||
      name === ".turbo" ||
      name === "release" ||
      name === "__eslint_fixtures__"
    ) {
      continue;
    }
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkTs(p, out);
    else if (
      /\.(ts|tsx)$/.test(name) &&
      !name.endsWith(".test.ts") &&
      !name.endsWith(".test.tsx")
    ) {
      out.push(p);
    }
  }
  return out;
}

function collectPackageSrcRoots(): string[] {
  const roots: string[] = [];
  const packagesRoot = join(repoRoot, "packages");
  for (const name of readdirSync(packagesRoot)) {
    const top = join(packagesRoot, name);
    if (!statSync(top).isDirectory()) continue;
    const topSrc = join(top, "src");
    if (existsSync(topSrc)) {
      roots.push(topSrc);
      continue;
    }
    // Nested workspaces (e.g. packages/growth/*)
    for (const child of readdirSync(top)) {
      const childSrc = join(top, child, "src");
      if (existsSync(childSrc)) roots.push(childSrc);
    }
  }
  return roots;
}

function collectPackageJsonPaths(): string[] {
  const out: string[] = [join(repoRoot, "package.json")];
  for (const area of ["packages", "apps"] as const) {
    const areaRoot = join(repoRoot, area);
    for (const name of readdirSync(areaRoot)) {
      const top = join(areaRoot, name);
      if (!statSync(top).isDirectory()) continue;
      const topPkg = join(top, "package.json");
      if (existsSync(topPkg)) out.push(topPkg);
      for (const child of readdirSync(top)) {
        const childPkg = join(top, child, "package.json");
        if (existsSync(childPkg)) out.push(childPkg);
      }
    }
  }
  return out;
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function envelopeJson(data: Record<string, unknown>): string {
  return JSON.stringify(withSchemaVersion({ data }));
}

describe("X-B Fortification Cross-Prove", () => {
  it("owner prove stamps exist and remain GREEN", () => {
    for (const owner of OWNER_PROVES) {
      const abs = join(repoRoot, owner.path);
      expect(existsSync(abs), `${owner.id} missing`).toBe(true);
      const text = readFileSync(abs, "utf8");
      expect(text, `${owner.id} not GREEN`).toMatch(/Status:\*\*\s*GREEN/);
      expect(text).toMatch(/\*\*PASS\*\*|PASS/);
    }
    const xa = readFileSync(
      join(repoRoot, "docs/appendix/XA_FORTIFICATION_CONTRACT.md"),
      "utf8",
    );
    expect(xa).toMatch(/Cross-prove:\*\*\s*`x-b`/);
    expect(xa).toMatch(/XB_FORTIFICATION_PROVE\.md/);
  });

  it("§1 WAL + IMMEDIATE + mutex still owned by @clime/storage", () => {
    const clientSrc = readFileSync(
      join(repoRoot, "packages/storage/src/db/client.ts"),
      "utf8",
    );
    expect(clientSrc.includes(JM) && clientSrc.includes(WAL)).toBe(true);
    expect(clientSrc).toMatch(/synchronous\s*=\s*NORMAL/);
    expect(clientSrc).toMatch(/busy_timeout/);

    const gateSrc = readFileSync(
      join(repoRoot, "packages/storage/src/runtime/write-gate.ts"),
      "utf8",
    );
    expect(gateSrc.includes(BEGIN_IMM)).toBe(true);
    expect(gateSrc.includes("Async" + "Mutex")).toBe(true);

    const mutexSrc = readFileSync(
      join(repoRoot, "packages/storage/src/runtime/async-mutex.ts"),
      "utf8",
    );
    expect(mutexSrc.includes(CLASS_MUTEX)).toBe(true);
  });

  it("§1 SM optimistic lock + lease heartbeat still in workflow/automation", () => {
    const sm = readFileSync(
      join(repoRoot, "packages/workflow/src/task-sm.ts"),
      "utf8",
    );
    expect(sm).toContain("PAUSED_CHALLENGE");

    const workflowEngine = readFileSync(
      join(repoRoot, "packages/workflow/src/engine.ts"),
      "utf8",
    );
    expect(workflowEngine).toContain("transitionWithLock");
    expect(workflowEngine).toMatch(/conflict/);

    const queue = readFileSync(
      join(repoRoot, "packages/automation/src/queue.ts"),
      "utf8",
    );
    expect(queue).toMatch(/heartbeat|lease|reclaim/i);
    expect(DEFAULT_MAX_CONCURRENT_WORKERS).toBeLessThanOrEqual(3);
    expect(DEFAULT_MAX_CONCURRENT_WORKERS).toBeGreaterThanOrEqual(2);
  });

  it("§2 Gaussian jitter 5–45s + daily quota + session sandbox", () => {
    expect(JITTER_MIN_MS).toBe(5_000);
    expect(JITTER_MAX_MS).toBe(45_000);
    expect(DEFAULT_DAILY_PUBLISH_QUOTA).toBeGreaterThan(0);
    for (let i = 0; i < 40; i++) {
      const ms = sampleGaussianJitterMs(() => (i + 1) / 41);
      expect(ms).toBeGreaterThanOrEqual(JITTER_MIN_MS);
      expect(ms).toBeLessThanOrEqual(JITTER_MAX_MS);
    }
    const sandbox = createSessionSandbox();
    const a = sandbox.acquire("acct-a", "x");
    const b = sandbox.acquire("acct-b", "x");
    expect(a.sandboxId).not.toBe(b.sandboxId);
    expect(sandbox.sharesContext("acct-a", "acct-b")).toBe(false);
  });

  it("§2 challenge terminal + bypass impl = 0 in product sources", () => {
    const shared = readFileSync(
      join(repoRoot, "packages/shared/src/schema.ts"),
      "utf8",
    );
    expect(shared).toContain("PAUSED_CHALLENGE");

    const offenders: string[] = [];
    for (const root of [...collectPackageSrcRoots(), join(repoRoot, "apps")]) {
      for (const file of walkTs(root)) {
        const code = stripComments(readFileSync(file, "utf8"));
        for (const re of BYPASS_IMPL) {
          if (re.test(code)) {
            offenders.push(relative(repoRoot, file).replace(/\\/g, "/"));
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("§3 jobId non-block [A] methods retained + Governor admit path exists", () => {
    const asyncKinds: string[] = [];
    for (const [ns, methods] of Object.entries(NAMESPACE_METHOD_METADATA)) {
      for (const [method, meta] of Object.entries(methods)) {
        if (meta.kind === "A") asyncKinds.push(`${ns}.${method}`);
      }
    }
    expect(asyncKinds.length).toBeGreaterThanOrEqual(7);
    expect(asyncKinds).toContain("automation.startMission");
    expect(asyncKinds).toContain("account.publish");

    const gov = readFileSync(
      join(repoRoot, "packages/feature-management/src/runtime/admit.ts"),
      "utf8",
    );
    expect(gov).toMatch(/export async function admit/);
    expect(gov).toMatch(/GOVERNOR|throttle|governor/i);
  });

  it("§4 outbox atomic enqueue still on ClimeStorage + publisher in automation", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      expect(typeof storage.runAtomicWrite).toBe("function");
      const { id: projectId } = await storage.projects.create({
        name: "xb-atomic",
      });
      const result = await storage.runAtomicWrite(async (uow) => {
        const { id: missionId } = await uow.missions.create({
          projectId,
          missionDate: "2026-08-07",
          title: "xb-paired",
          status: "open",
          priority: 1,
          decisionId: null,
          payloadJson: envelopeJson({ paired: true }),
        });
        const { id: outboxId } = await uow.eventOutbox.enqueue({
          projectId,
          type: "mission.created",
          payloadJson: envelopeJson({ missionId }),
          traceId: "trace-xb-atomic",
          occurredAt: new Date().toISOString(),
          status: "pending",
        });
        return { missionId, outboxId };
      });
      expect(await storage.missions.getById(result.missionId)).not.toBeNull();
      const pending = await storage.eventOutbox.listPending(20);
      expect(pending.some((r) => r.id === result.outboxId)).toBe(true);
    } finally {
      storage.close();
    }

    const publisher = readFileSync(
      join(repoRoot, "packages/automation/src/outbox-publisher.ts"),
      "utf8",
    );
    expect(publisher).toMatch(/listPending|markPublished/);
  });

  it("§5 Vault/Session packages + HumanGate spend seat", async () => {
    expect(existsSync(join(repoRoot, "packages/vault/src"))).toBe(true);
    expect(existsSync(join(repoRoot, "packages/session/src"))).toBe(true);
    expect(existsSync(join(repoRoot, "packages/config/src"))).toBe(true);

    const gitignore = readFileSync(join(repoRoot, ".gitignore"), "utf8");
    expect(gitignore).toMatch(/\.env/);
    expect(gitignore).toMatch(/\.vault\/|secrets\//);

    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({ name: "xb-hg" });
      const engine = createAnalyticsEngine(storage);
      const blocked = await engine.createExperiment({
        projectId,
        name: "spend",
        spend: 50,
      });
      expect(blocked.ok).toBe(false);
      expect(blocked.terminal).toBe("BLOCKED_HUMAN");
      expect(blocked.autoSpendApplied).toBe(0);
    } finally {
      storage.close();
    }
  });

  it("§6 circuit breaker + fallback + backoff live only under @clime/ai", () => {
    const aiIndex = readFileSync(join(repoRoot, "packages/ai/src/index.ts"), "utf8");
    expect(aiIndex).toMatch(/createCircuitBreakerRegistry|circuit-breaker/);
    expect(aiIndex).toMatch(/createAIEngine|Cost/);
    expect(existsSync(join(repoRoot, "packages/ai/src/circuit-breaker.ts"))).toBe(
      true,
    );
    expect(existsSync(join(repoRoot, "packages/ai/src/backoff.ts"))).toBe(true);

    const engine = readFileSync(
      join(repoRoot, "packages/ai/src/create-ai-engine.ts"),
      "utf8",
    );
    expect(engine).toMatch(/fallback|ollama|breaker/i);

    const leakRoots = [
      join(repoRoot, "packages/growth"),
      join(repoRoot, "packages/content"),
      join(repoRoot, "packages/workflow"),
      join(repoRoot, "packages/automation"),
      join(repoRoot, "packages/meta"),
    ];
    const offenders: string[] = [];
    for (const root of leakRoots) {
      for (const file of walkTs(root)) {
        const src = readFileSync(file, "utf8");
        if (/createCircuitBreakerRegistry|class CircuitBreaker/.test(src)) {
          offenders.push(relative(repoRoot, file).replace(/\\/g, "/"));
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("meta: no duplicate WAL/mutex outside storage; Prisma/Supabase deps = 0", () => {
    const offenders: string[] = [];
    for (const root of collectPackageSrcRoots()) {
      if (root.replace(/\\/g, "/").includes("/packages/storage/")) continue;
      for (const file of walkTs(root)) {
        if (hasHardeningLeak(readFileSync(file, "utf8"))) {
          offenders.push(relative(repoRoot, file).replace(/\\/g, "/"));
        }
      }
    }
    for (const file of walkTs(join(repoRoot, "apps"))) {
      // Skip this auditor file (split literals would still be a false positive).
      if (file.replace(/\\/g, "/").endsWith("/prove.xb.test.ts")) continue;
      if (hasHardeningLeak(readFileSync(file, "utf8"))) {
        offenders.push(relative(repoRoot, file).replace(/\\/g, "/"));
      }
    }
    expect(offenders).toEqual([]);

    for (const p of collectPackageJsonPaths()) {
      const pkg = JSON.parse(readFileSync(p, "utf8")) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      for (const dep of FORBIDDEN_DEPS) {
        expect(pkg.dependencies?.[dep], `${p} deps ${dep}`).toBeUndefined();
        expect(pkg.devDependencies?.[dep], `${p} devDeps ${dep}`).toBeUndefined();
      }
    }
  });
});
