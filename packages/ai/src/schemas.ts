import { schemaVersionSchema } from "@clime/shared";
import { z } from "zod";

export const taskClassSchema = z.enum([
  "research_summarize",
  "content_longform",
  "content_short",
  "validate_json",
  "embed_default",
  "generic_chat",
]);
export type TaskClass = z.infer<typeof taskClassSchema>;

export const qualityTierSchema = z.enum(["draft", "final", "critical"]);
export type QualityTier = z.infer<typeof qualityTierSchema>;

export const latencyClassSchema = z.enum(["interactive", "batch"]);
export type LatencyClass = z.infer<typeof latencyClassSchema>;

export const budgetClassSchema = z.enum([
  "free_local",
  "cheap_cloud",
  "standard",
  "premium",
]);
export type BudgetClass = z.infer<typeof budgetClassSchema>;

export const aiRoleSchema = z.enum(["system", "user", "assistant"]);
export type AiRole = z.infer<typeof aiRoleSchema>;

export const aiMessageSchema = z.object({
  role: aiRoleSchema,
  content: z.string(),
});
export type AiMessage = z.infer<typeof aiMessageSchema>;

export const aiCompleteRequestSchema = z.object({
  schema_version: schemaVersionSchema,
  traceId: z.string().min(1),
  taskClass: taskClassSchema,
  messages: z.array(aiMessageSchema).min(1),
  responseFormat: z.enum(["text", "json"]).optional(),
  qualityTier: qualityTierSchema.optional(),
  latencyClass: latencyClassSchema.optional(),
  budgetClass: budgetClassSchema.optional(),
  maxTokens: z.number().int().positive().optional(),
});
export type AiCompleteRequest = z.infer<typeof aiCompleteRequestSchema> & {
  signal?: AbortSignal;
};

export const aiCompleteResultSchema = z.object({
  schema_version: schemaVersionSchema,
  traceId: z.string().min(1),
  text: z.string(),
  adapterId: z.string().min(1),
  model: z.string().min(1),
  usage: z
    .object({
      inputTokens: z.number().optional(),
      outputTokens: z.number().optional(),
      costUnits: z.number().optional(),
    })
    .optional(),
  usedFallback: z.boolean(),
});
export type AiCompleteResult = z.infer<typeof aiCompleteResultSchema>;

export type AiAdapterCapabilities = {
  chat: boolean;
  vision: boolean;
  embed: boolean;
  json_mode: boolean;
  tools: boolean;
};

export type AiAdapterCompleteInput = {
  messages: AiMessage[];
  model: string;
  maxTokens?: number;
  responseFormat?: "text" | "json";
  apiKey: string | null;
  signal?: AbortSignal;
};

export type AiAdapter = {
  readonly id: string;
  readonly vendor: string;
  readonly capabilities: AiAdapterCapabilities;
  readonly defaultModel: string;
  complete(input: AiAdapterCompleteInput): Promise<{
    text: string;
    model: string;
    usage?: { inputTokens?: number; outputTokens?: number };
  }>;
  embed?(input: {
    texts: string[];
    model: string;
    apiKey: string | null;
    signal?: AbortSignal;
  }): Promise<{ vectors: number[][] }>;
  health(): Promise<"ok" | "degraded" | "down">;
};
