import type {
  AiAdapter,
  AiAdapterCapabilities,
  AiAdapterCompleteInput,
} from "../schemas.js";

export type OllamaAdapterOptions = {
  id?: string;
  baseUrl?: string;
  defaultModel?: string;
  capabilities?: Partial<AiAdapterCapabilities>;
  completeImpl?: (
    input: AiAdapterCompleteInput,
  ) => Promise<{
    text: string;
    model: string;
    usage?: { inputTokens?: number; outputTokens?: number };
  }>;
  healthImpl?: () => Promise<"ok" | "degraded" | "down">;
};

/**
 * Local Ollama fallback adapter (HTTP-shaped).
 * Unit tests inject completeImpl — no live daemon required.
 * apiKey is ignored (local / no vault secret).
 */
export function createOllamaAdapter(
  options: OllamaAdapterOptions = {},
): AiAdapter {
  const id = options.id ?? "ollama";
  const baseUrl = options.baseUrl ?? "http://127.0.0.1:11434";
  const capabilities: AiAdapterCapabilities = {
    chat: true,
    vision: false,
    embed: false,
    json_mode: true,
    tools: false,
    ...options.capabilities,
  };

  return {
    id,
    vendor: "ollama",
    capabilities,
    defaultModel: options.defaultModel ?? "llama3.2",

    async complete(input) {
      if (input.signal?.aborted) {
        const err = new Error("Aborted");
        err.name = "AbortError";
        throw err;
      }
      if (options.completeImpl) {
        return options.completeImpl(input);
      }
      // Skeleton default: deterministic local response without network.
      // Live HTTP to `${baseUrl}/api/chat` can replace this later.
      void baseUrl;
      const last = input.messages[input.messages.length - 1];
      return {
        text: `[ollama-local] ${last?.content ?? ""}`,
        model: input.model,
        usage: { inputTokens: 8, outputTokens: 16 },
      };
    },

    async health() {
      if (options.healthImpl) return options.healthImpl();
      return "ok";
    },
  };
}
