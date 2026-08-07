/**
 * Storage JSON boundary helpers — re-export / thin wrappers over @clime/shared.
 * Sqlite*Repository validates `*_json` writes via these envelopes (s2-c).
 */
export {
  SCHEMA_VERSION,
  withSchemaVersion,
  schemaVersionSchema,
  withSchemaVersionSchema,
  parseWithSchemaVersion,
  boundaryEnvelopeSchema,
  publishModeSchema,
  riskLevelSchema,
  publishingHistoryKindSchema,
  taskStateSchema,
  featureLifecycleSchema,
  settingsScopeSchema,
  goalHorizonSchema,
  type SchemaVersion,
  type WithSchemaVersion,
  type BoundaryEnvelope,
  type PublishMode,
  type RiskLevel,
  type PublishingHistoryKind,
  type TaskState,
  type FeatureLifecycle,
  type SettingsScope,
  type GoalHorizon,
} from "@clime/shared";

import { z } from "zod";
import { withSchemaVersionSchema } from "@clime/shared";

/** Generic JSON document column envelope (prefs / values / flags / metrics). */
export const jsonDocumentEnvelopeSchema = withSchemaVersionSchema({
  data: z.record(z.string(), z.unknown()).optional(),
});
export type JsonDocumentEnvelope = z.infer<typeof jsonDocumentEnvelopeSchema>;
