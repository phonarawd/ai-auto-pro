import { VaultNotFoundError, VaultRefError } from "@clime/vault";
import {
  computeBackoffDelayMs,
  defaultSleep,
  resolveBackoffOptions,
} from "./backoff.js";
import { createCircuitBreakerRegistry } from "./circuit-breaker.js";
import { createCostIntelligence } from "./cost/cost-intelligence.js";
import {
  AiAllProvidersFailedError,
  AiAuthError,
  AiBudgetExhaustedError,
  AiValidationError,
} from "./errors.js";
import { aiCompleteRequestSchema } from "./schemas.js";
import type {
  AIEngine,
  AiAdapterRegistration,
  CreateAIEngineOptions,
} from "./types.js";

function isAbortError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name: string }).name === "AbortError"
  );
}

function isNonRetryable(err: unknown): boolean {
  if (isAbortError(err)) return true;
  if (err instanceof AiAuthError) return true;
  if (err instanceof AiValidationError) return true;
  if (err instanceof VaultRefError || err instanceof VaultNotFoundError) {
    return true;
  }
  return false;
}

function buildAttemptOrder(
  chain: readonly string[],
  preferredId: string,
): string[] {
  const rest = chain.filter((id) => id !== preferredId);
  if (chain.includes(preferredId)) {
    return [preferredId, ...rest];
  }
  return [...chain];
}

export function createAIEngine(options: CreateAIEngineOptions): AIEngine {
  const byId = new Map<string, AiAdapterRegistration>();
  for (const reg of options.registrations) {
    byId.set(reg.adapter.id, reg);
  }

  const cost =
    options.cost ??
    createCostIntelligence({ registrations: options.registrations });
  const breakers = createCircuitBreakerRegistry(
    options.breaker,
    options.now ?? (() => Date.now()),
  );
  const backoff = resolveBackoffOptions(options.backoff);
  const sleep = options.sleep ?? defaultSleep;

  return {
    async complete(req) {
      const parsed = aiCompleteRequestSchema.safeParse({
        schema_version: req.schema_version,
        traceId: req.traceId,
        taskClass: req.taskClass,
        messages: req.messages,
        responseFormat: req.responseFormat,
        qualityTier: req.qualityTier,
        latencyClass: req.latencyClass,
        budgetClass: req.budgetClass,
        maxTokens: req.maxTokens,
      });
      if (!parsed.success) {
        throw new AiValidationError(
          parsed.error.message,
          typeof req.traceId === "string" ? req.traceId : undefined,
        );
      }

      const traceId = parsed.data.traceId;
      const budgetClass = parsed.data.budgetClass ?? "standard";
      const qualityTier = parsed.data.qualityTier ?? "draft";
      const chain =
        options.policy.chains[parsed.data.taskClass] ??
        options.policy.defaultChain;
      const registeredChain = chain.filter((id) => byId.has(id));
      if (registeredChain.length === 0) {
        throw new AiAllProvidersFailedError(traceId, [
          new Error("No registered adapters in fallback chain"),
        ]);
      }

      const proposal = cost.propose({
        taskClass: parsed.data.taskClass,
        budgetClass,
        qualityTier,
        candidateAdapterIds: registeredChain,
      });

      const budget = cost.checkBudget({
        estimatedCostUnits: proposal.estimatedCostUnits,
      });
      if (!budget.ok) {
        throw new AiBudgetExhaustedError(
          "AI budget exhausted",
          traceId,
        );
      }

      const attemptOrder = buildAttemptOrder(
        registeredChain,
        proposal.adapterId,
      );
      const causes: unknown[] = [];
      let preferredSkippedOrFailed = false;

      for (const adapterId of attemptOrder) {
        const reg = byId.get(adapterId);
        if (!reg) continue;

        if (!breakers.allow(adapterId)) {
          preferredSkippedOrFailed = true;
          causes.push(new Error(`circuit_open:${adapterId}`));
          continue;
        }

        let apiKey: string | null = null;
        try {
          if (reg.apiKeyRef != null) {
            apiKey = await options.vault.getSecret(reg.apiKeyRef);
          }
        } catch (err) {
          breakers.recordFailure(adapterId);
          preferredSkippedOrFailed = true;
          causes.push(
            err instanceof AiAuthError
              ? err
              : new AiAuthError(
                  err instanceof Error ? err.message : "Vault secret error",
                  traceId,
                ),
          );
          if (isNonRetryable(err)) continue;
          continue;
        }

        const maxAttempts = 1 + backoff.maxRetriesPerAdapter;
        let adapterSucceeded = false;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            const result = await reg.adapter.complete({
              messages: parsed.data.messages,
              model: proposal.adapterId === adapterId
                ? proposal.model
                : reg.adapter.defaultModel,
              maxTokens: parsed.data.maxTokens,
              responseFormat: parsed.data.responseFormat,
              apiKey,
              signal: req.signal,
            });

            breakers.recordSuccess(adapterId);
            const tokenTotal =
              (result.usage?.inputTokens ?? 0) +
              (result.usage?.outputTokens ?? 0);
            const costUnits =
              tokenTotal > 0
                ? Math.max(
                    1,
                    Math.ceil(
                      (tokenTotal / 1000) * reg.costUnitsPer1kTokens,
                    ),
                  )
                : proposal.estimatedCostUnits;
            cost.recordUsage({ adapterId, costUnits, traceId });

            const usedFallback =
              preferredSkippedOrFailed || adapterId !== proposal.adapterId;

            adapterSucceeded = true;
            return {
              schema_version: 1 as const,
              traceId,
              text: result.text,
              adapterId,
              model: result.model,
              usage: {
                ...result.usage,
                costUnits,
              },
              usedFallback,
            };
          } catch (err) {
            causes.push(err);
            breakers.recordFailure(adapterId);
            preferredSkippedOrFailed = true;

            if (isNonRetryable(err) || attempt >= maxAttempts - 1) {
              break;
            }

            const delay = computeBackoffDelayMs(attempt, backoff);
            await sleep(delay);
          }
        }

        if (adapterSucceeded) break;
      }

      throw new AiAllProvidersFailedError(traceId, causes);
    },

    async health() {
      const out: Record<string, "ok" | "degraded" | "down" | "circuit_open"> =
        {};
      for (const [id, reg] of byId) {
        if (!breakers.allow(id)) {
          out[id] = "circuit_open";
          continue;
        }
        try {
          out[id] = await reg.adapter.health();
        } catch {
          out[id] = "down";
        }
      }
      return out;
    },
  };
}
