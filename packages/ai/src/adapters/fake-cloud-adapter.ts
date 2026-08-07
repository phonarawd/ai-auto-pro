import type {
  AiAdapter,
  AiAdapterCapabilities,
  AiAdapterCompleteInput,
} from "../schemas.js";

export type FakeCloudAdapterOptions = {
  id: string;
  vendor?: string;
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
 * Cloud-shaped stub adapter. Real vendor SDKs (openai, etc.) must live
 * behind the same AiAdapter interface under src/adapters/ only.
 */
export function createFakeCloudAdapter(
  options: FakeCloudAdapterOptions,
): AiAdapter {
  const capabilities: AiAdapterCapabilities = {
    chat: true,
    vision: false,
    embed: true,
    json_mode: true,
    tools: false,
    ...options.capabilities,
  };

  return {
    id: options.id,
    vendor: options.vendor ?? "fake-cloud",
    capabilities,
    defaultModel: options.defaultModel ?? "fake-cloud-default",

    async complete(input) {
      if (input.signal?.aborted) {
        const err = new Error("Aborted");
        err.name = "AbortError";
        throw err;
      }
      if (options.completeImpl) {
        return options.completeImpl(input);
      }
      if (!input.apiKey) {
        throw new Error("Fake cloud adapter requires apiKey");
      }
      const last = input.messages[input.messages.length - 1];
      return {
        text: `[${options.id}] ${last?.content ?? ""}`,
        model: input.model,
        usage: { inputTokens: 10, outputTokens: 20 },
      };
    },

    async embed(input) {
      if (!input.apiKey) {
        throw new Error("Fake cloud adapter requires apiKey for embed");
      }
      return {
        vectors: input.texts.map((t) => [t.length, 0, 1]),
      };
    },

    async health() {
      if (options.healthImpl) return options.healthImpl();
      return "ok";
    },
  };
}
