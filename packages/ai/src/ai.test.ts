import { createMemoryVault } from "@clime/vault";
import { describe, expect, it } from "vitest";
import {
  AiAllProvidersFailedError,
  AiBudgetExhaustedError,
  AiValidationError,
  createAIEngine,
  createCostIntelligence,
  createFakeCloudAdapter,
  createOllamaAdapter,
} from "./index.js";

async function seedKey(
  vault: ReturnType<typeof createMemoryVault>,
  id: string,
  plaintext = "sk-test-key",
) {
  return vault.putSecret({ id, kind: "api_key", plaintext });
}

describe("@clime/ai engine", () => {
  it("completes via vault-ref credentials (plaintext not on registration)", async () => {
    const vault = createMemoryVault();
    const { ref } = await seedKey(vault, "primary");
    const engine = createAIEngine({
      vault,
      registrations: [
        {
          adapter: createFakeCloudAdapter({ id: "cloud-primary" }),
          apiKeyRef: ref,
          costUnitsPer1kTokens: 10,
          budgetClasses: ["standard", "cheap_cloud", "premium"],
        },
      ],
      policy: { defaultChain: ["cloud-primary"], chains: {} },
      backoff: { maxRetriesPerAdapter: 0, jitter: false },
    });

    const result = await engine.complete({
      schema_version: 1,
      traceId: "tr-1",
      taskClass: "generic_chat",
      messages: [{ role: "user", content: "hello" }],
      budgetClass: "standard",
    });

    expect(result.text).toContain("hello");
    expect(result.adapterId).toBe("cloud-primary");
    expect(result.usedFallback).toBe(false);
    expect(result.schema_version).toBe(1);
  });

  it("opens circuit after failures and falls back to ollama", async () => {
    const vault = createMemoryVault();
    const { ref } = await seedKey(vault, "primary");
    let cloudCalls = 0;

    const engine = createAIEngine({
      vault,
      registrations: [
        {
          adapter: createFakeCloudAdapter({
            id: "cloud-primary",
            completeImpl: async () => {
              cloudCalls += 1;
              throw new Error("cloud down");
            },
          }),
          apiKeyRef: ref,
          costUnitsPer1kTokens: 10,
          budgetClasses: ["standard"],
        },
        {
          adapter: createOllamaAdapter({
            completeImpl: async () => ({
              text: "from-ollama",
              model: "llama3.2",
            }),
          }),
          apiKeyRef: null,
          // Fallback-only for this test — Cost must prefer cloud on standard.
          costUnitsPer1kTokens: 0,
          budgetClasses: ["free_local"],
        },
      ],
      policy: {
        defaultChain: ["cloud-primary", "ollama"],
        chains: {
          content_longform: ["cloud-primary", "ollama"],
        },
      },
      breaker: { failureThreshold: 1, openMs: 60_000 },
      backoff: { maxRetriesPerAdapter: 0, jitter: false },
    });

    const first = await engine.complete({
      schema_version: 1,
      traceId: "tr-fb-1",
      taskClass: "content_longform",
      messages: [{ role: "user", content: "x" }],
      budgetClass: "standard",
    });
    expect(first.adapterId).toBe("ollama");
    expect(first.usedFallback).toBe(true);
    expect(first.text).toBe("from-ollama");
    expect(cloudCalls).toBe(1);

    const second = await engine.complete({
      schema_version: 1,
      traceId: "tr-fb-2",
      taskClass: "content_longform",
      messages: [{ role: "user", content: "y" }],
      budgetClass: "standard",
    });
    expect(second.adapterId).toBe("ollama");
    expect(second.usedFallback).toBe(true);
    // Open breaker short-circuits cloud — no additional cloud call.
    expect(cloudCalls).toBe(1);

    const health = await engine.health();
    expect(health["cloud-primary"]).toBe("circuit_open");
    expect(health.ollama).toBe("ok");
  });

  it("applies exponential backoff between retries", async () => {
    const vault = createMemoryVault();
    const { ref } = await seedKey(vault, "primary");
    const sleeps: number[] = [];
    let attempts = 0;

    const engine = createAIEngine({
      vault,
      registrations: [
        {
          adapter: createFakeCloudAdapter({
            id: "cloud-primary",
            completeImpl: async () => {
              attempts += 1;
              if (attempts < 3) throw new Error("transient");
              return { text: "ok", model: "m" };
            },
          }),
          apiKeyRef: ref,
          costUnitsPer1kTokens: 5,
          budgetClasses: ["standard"],
        },
      ],
      policy: { defaultChain: ["cloud-primary"], chains: {} },
      breaker: { failureThreshold: 10 },
      backoff: {
        maxRetriesPerAdapter: 2,
        baseDelayMs: 40,
        maxDelayMs: 10_000,
        jitter: false,
      },
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    const result = await engine.complete({
      schema_version: 1,
      traceId: "tr-bo",
      taskClass: "generic_chat",
      messages: [{ role: "user", content: "retry" }],
    });

    expect(result.text).toBe("ok");
    expect(attempts).toBe(3);
    expect(sleeps).toEqual([40, 80]);
  });

  it("cost stub prefers free_local → ollama", async () => {
    const vault = createMemoryVault();
    const { ref } = await seedKey(vault, "primary");
    const cost = createCostIntelligence({
      registrations: [
        {
          adapter: createFakeCloudAdapter({ id: "cloud-primary" }),
          apiKeyRef: ref,
          costUnitsPer1kTokens: 10,
          budgetClasses: ["standard", "premium"],
        },
        {
          adapter: createOllamaAdapter(),
          apiKeyRef: null,
          costUnitsPer1kTokens: 0,
          budgetClasses: ["free_local", "standard"],
        },
      ],
    });

    const proposal = cost.propose({
      taskClass: "generic_chat",
      budgetClass: "free_local",
      qualityTier: "draft",
      candidateAdapterIds: ["cloud-primary", "ollama"],
    });
    expect(proposal.adapterId).toBe("ollama");
    expect(proposal.estimatedCostUnits).toBeLessThanOrEqual(1);
  });

  it("hard-stops when budget exhausted", async () => {
    const vault = createMemoryVault();
    const { ref } = await seedKey(vault, "primary");
    const regs = [
      {
        adapter: createFakeCloudAdapter({ id: "cloud-primary" }),
        apiKeyRef: ref,
        costUnitsPer1kTokens: 100,
        budgetClasses: ["standard" as const],
      },
    ];
    const engine = createAIEngine({
      vault,
      registrations: regs,
      policy: { defaultChain: ["cloud-primary"], chains: {} },
      cost: createCostIntelligence({
        registrations: regs,
        budgetLimitUnits: 0,
      }),
    });

    await expect(
      engine.complete({
        schema_version: 1,
        traceId: "tr-budget",
        taskClass: "generic_chat",
        messages: [{ role: "user", content: "x" }],
        budgetClass: "standard",
      }),
    ).rejects.toBeInstanceOf(AiBudgetExhaustedError);
  });

  it("rejects invalid requests with traceId", async () => {
    const vault = createMemoryVault();
    const engine = createAIEngine({
      vault,
      registrations: [],
      policy: { defaultChain: ["cloud-primary"], chains: {} },
    });

    await expect(
      engine.complete({
        schema_version: 1,
        traceId: "",
        taskClass: "generic_chat",
        messages: [{ role: "user", content: "x" }],
      }),
    ).rejects.toBeInstanceOf(AiValidationError);
  });

  it("throws AiAllProvidersFailedError when chain exhausted", async () => {
    const vault = createMemoryVault();
    const { ref } = await seedKey(vault, "primary");
    const engine = createAIEngine({
      vault,
      registrations: [
        {
          adapter: createFakeCloudAdapter({
            id: "cloud-primary",
            completeImpl: async () => {
              throw new Error("down");
            },
          }),
          apiKeyRef: ref,
          costUnitsPer1kTokens: 1,
          budgetClasses: ["standard"],
        },
      ],
      policy: { defaultChain: ["cloud-primary"], chains: {} },
      breaker: { failureThreshold: 100 },
      backoff: { maxRetriesPerAdapter: 0, jitter: false },
    });

    const err = await engine
      .complete({
        schema_version: 1,
        traceId: "tr-all",
        taskClass: "generic_chat",
        messages: [{ role: "user", content: "x" }],
      })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AiAllProvidersFailedError);
    expect((err as AiAllProvidersFailedError).traceId).toBe("tr-all");
  });

  it("swapping adapters is registration/policy only", async () => {
    const vault = createMemoryVault();
    const callSite = async (engine: ReturnType<typeof createAIEngine>) =>
      engine.complete({
        schema_version: 1,
        traceId: "tr-swap",
        taskClass: "generic_chat",
        messages: [{ role: "user", content: "swap" }],
        budgetClass: "free_local",
      });

    const ollamaOnly = createAIEngine({
      vault,
      registrations: [
        {
          adapter: createOllamaAdapter({
            completeImpl: async () => ({
              text: "local",
              model: "llama3.2",
            }),
          }),
          apiKeyRef: null,
          costUnitsPer1kTokens: 0,
          budgetClasses: ["free_local", "standard"],
        },
      ],
      policy: { defaultChain: ["ollama"], chains: {} },
    });

    const { ref } = await seedKey(vault, "c1");
    const cloudOnly = createAIEngine({
      vault,
      registrations: [
        {
          adapter: createFakeCloudAdapter({
            id: "cloud-primary",
            completeImpl: async () => ({
              text: "cloud",
              model: "fake",
            }),
          }),
          apiKeyRef: ref,
          costUnitsPer1kTokens: 5,
          budgetClasses: ["standard", "free_local"],
        },
      ],
      policy: { defaultChain: ["cloud-primary"], chains: {} },
    });

    expect((await callSite(ollamaOnly)).text).toBe("local");
    expect((await callSite(cloudOnly)).text).toBe("cloud");
  });

  it("does not keep plaintext api key on registration object", async () => {
    const vault = createMemoryVault();
    const { ref } = await seedKey(vault, "primary", "sk-super-secret");
    const reg = {
      adapter: createFakeCloudAdapter({ id: "cloud-primary" }),
      apiKeyRef: ref,
      costUnitsPer1kTokens: 1,
      budgetClasses: ["standard" as const],
    };
    expect(JSON.stringify(reg)).not.toContain("sk-super-secret");
    expect(reg.apiKeyRef).toMatch(/^vault:/);
    expect(await vault.getSecret(ref)).toBe("sk-super-secret");
  });
});

describe("@clime/ai circuit breaker unit", () => {
  it("transitions closed → open → half_open → closed", async () => {
    const { createCircuitBreakerRegistry } = await import(
      "./circuit-breaker.js"
    );
    let t = 0;
    const br = createCircuitBreakerRegistry(
      { failureThreshold: 2, openMs: 100, halfOpenSuccesses: 1 },
      () => t,
    );

    expect(br.allow("a")).toBe(true);
    br.recordFailure("a");
    expect(br.getState("a")).toBe("closed");
    br.recordFailure("a");
    expect(br.getState("a")).toBe("open");
    expect(br.allow("a")).toBe(false);

    t = 100;
    expect(br.allow("a")).toBe(true);
    expect(br.getState("a")).toBe("half_open");
    br.recordSuccess("a");
    expect(br.getState("a")).toBe("closed");
  });
});

describe("@clime/ai backoff unit", () => {
  it("computes exponential delays without jitter", async () => {
    const { computeBackoffDelayMs, resolveBackoffOptions } = await import(
      "./backoff.js"
    );
    const opts = resolveBackoffOptions({
      baseDelayMs: 50,
      maxDelayMs: 200,
      jitter: false,
    });
    expect(computeBackoffDelayMs(0, opts, () => 0)).toBe(50);
    expect(computeBackoffDelayMs(1, opts, () => 0)).toBe(100);
    expect(computeBackoffDelayMs(3, opts, () => 0)).toBe(200);
  });
});
