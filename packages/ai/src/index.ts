/**
 * @clime/ai — AI Engine: Adapters, Cost Intelligence, circuit breaker, fallback.
 * Vendor SDKs only under src/adapters/. Cost lives here — never in Meta.
 */

export type {
  AIEngine,
  AiAdapterRegistration,
  AiEnginePolicy,
  BackoffOptions,
  CircuitBreakerOptions,
  CostIntelligence,
  CostProposal,
  CreateAIEngineOptions,
  FallbackChain,
} from "./types.js";

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

export {
  aiCompleteRequestSchema,
  aiCompleteResultSchema,
  aiMessageSchema,
  budgetClassSchema,
  latencyClassSchema,
  qualityTierSchema,
  taskClassSchema,
} from "./schemas.js";

export {
  AiAllProvidersFailedError,
  AiAuthError,
  AiBudgetExhaustedError,
  AiCircuitOpenError,
  AiError,
  AiValidationError,
} from "./errors.js";

export {
  computeBackoffDelayMs,
  defaultSleep,
  resolveBackoffOptions,
} from "./backoff.js";

export {
  createCircuitBreakerRegistry,
  resolveCircuitBreakerOptions,
  type BreakerState,
  type CircuitBreakerRegistry,
} from "./circuit-breaker.js";

export { createCostIntelligence } from "./cost/cost-intelligence.js";

export {
  createFakeCloudAdapter,
  type FakeCloudAdapterOptions,
} from "./adapters/fake-cloud-adapter.js";

export {
  createOllamaAdapter,
  type OllamaAdapterOptions,
} from "./adapters/ollama-adapter.js";

export { createAIEngine } from "./create-ai-engine.js";
