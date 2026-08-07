import { z } from "zod";

export const AuthModeSchema = z.enum(["oauth", "session", "manual"]);
export type AuthMode = z.infer<typeof AuthModeSchema>;

export const PublishModeSchema = z.enum(["api", "session"]);
export type PublishMode = z.infer<typeof PublishModeSchema>;

export const RiskLevelSchema = z.enum(["low", "medium", "high"]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const SupportedMediaSchema = z.enum([
  "text",
  "image",
  "video",
  "reels",
  "shorts",
  "carousel",
]);
export type SupportedMedia = z.infer<typeof SupportedMediaSchema>;

export const ConnectorCapabilitiesSchema = z.object({
  canReadProfile: z.boolean(),
  canImportUrl: z.boolean(),
  canSchedule: z.boolean(),
  canPublish: z.boolean(),
  publishMode: PublishModeSchema,
  riskLevel: RiskLevelSchema,
  supportedMedia: z.array(SupportedMediaSchema),
});
export type ConnectorCapabilities = z.infer<typeof ConnectorCapabilitiesSchema>;

export const ConnectorRuntimeHintsSchema = z.object({
  requiresBAE: z.boolean().optional(),
  rateLimitPerMinute: z.number().optional(),
});
export type ConnectorRuntimeHints = z.infer<typeof ConnectorRuntimeHintsSchema>;

export const ConnectorManifestSchema = z.object({
  schema_version: z.literal(1),
  id: z.string().min(1),
  version: z.string().min(1),
  name: z.string().min(1),
  platform: z.string().min(1),
  authModes: z.array(AuthModeSchema).min(1),
  capabilities: ConnectorCapabilitiesSchema,
  runtimeHints: ConnectorRuntimeHintsSchema.optional(),
});
export type ConnectorManifest = z.infer<typeof ConnectorManifestSchema>;

export function validateConnectorManifest(input: unknown): ConnectorManifest {
  return ConnectorManifestSchema.parse(input);
}
