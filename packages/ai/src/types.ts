import type { Vault, VaultRef } from "@clime/vault";
import type {
  AiAdapter,
  AiCompleteRequest,
  AiCompleteResult,
  BudgetClass,
  QualityTier,
  TaskClass,
} from "./schemas.js";

export type {
  AiAdapter,
  AiAdapterCapabilities,
  AiAdapterCompleteInput,
  AiCompleteRequest,
  AiCompleteResult,
  AiMessage,
  AiRole,
  BudgetClass,
  LatencyClass,
  QualityTier,
  TaskClass,
} from "./schemas.js";

export type FallbackChain = readonly string[];

export type AiEnginePolicy = {
  chains: Partial<Record<TaskClass, FallbackChain>>;
  defaultChain: FallbackChain;
};

export type AiAdapterRegistration = {
  adapter: AiAdapter;
  /** Vault ref for API key; null = no secret (typical Ollama local). */
  apiKeyRef: VaultRef | null;
  /** Cost units per 1k tokens estimate (stub pricing). */
  costUnitsPer1kTokens: number;
  budgetClasses: BudgetClass[];
};

export type CostProposal = {
  schema_version: 1;
  adapterId: string;
  model: string;
  estimatedCostUnits: number;
  budgetClass: BudgetClass;
};

export type CostIntelligence = {
  propose(input: {
    taskClass: TaskClass;
    budgetClass: BudgetClass;
    qualityTier: QualityTier;
    candidateAdapterIds: string[];
  }): CostProposal;

  checkBudget(input: {
    projectId?: string;
    estimatedCostUnits: number;
  }): { ok: true } | { ok: false; code: "AI_BUDGET_EXHAUSTED" };

  recordUsage(input: {
    adapterId: string;
    costUnits: number;
    traceId: string;
  }): void;
};

export type CircuitBreakerOptions = {
  failureThreshold?: number;
  openMs?: number;
  halfOpenSuccesses?: number;
};

export type BackoffOptions = {
  maxRetriesPerAdapter?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** When true, add full jitter in [0, delay]. */
  jitter?: boolean;
};

export type AIEngine = {
  complete(req: AiCompleteRequest): Promise<AiCompleteResult>;
  health(): Promise<
    Record<string, "ok" | "degraded" | "down" | "circuit_open">
  >;
};

export type CreateAIEngineOptions = {
  vault: Vault;
  registrations: AiAdapterRegistration[];
  policy: AiEnginePolicy;
  cost?: CostIntelligence;
  breaker?: CircuitBreakerOptions;
  backoff?: BackoffOptions;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};
