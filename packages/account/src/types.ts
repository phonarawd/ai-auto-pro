import { z } from "zod";
import { PublishModeSchema, RiskLevelSchema } from "@clime/plugin-sdk";

export const PlatformCapabilityMatrixSchema = z.object({
  schema_version: z.literal(1),
  accountId: z.string(),
  platform: z.string(),
  canPublish: z.boolean(),
  publishMode: PublishModeSchema,
  riskLevel: RiskLevelSchema,
  readProfile: z.boolean(),
  importUrl: z.boolean(),
  schedule: z.boolean(),
  reelsOrShorts: z.boolean(),
  stories: z.boolean(),
  notice: z.string(),
  updatedAt: z.string(),
});
export type PlatformCapabilityMatrix = z.infer<typeof PlatformCapabilityMatrixSchema>;

export interface ConnectAccountInput {
  projectId: string;
  platform: string;
  accountName: string;
  authMode: "oauth" | "session" | "manual";
  credentialRef?: string;
  metadata?: Record<string, unknown>;
}

export interface AccountRouteInput {
  projectId?: string;
  channel?: string;
  campaignTag?: string;
  action?: string;
}

export interface AccountRouteResult {
  schema_version: 1;
  targetAccount: string;
  platform: string;
  publishMode: "api" | "session";
  riskLevel: "low" | "medium" | "high";
  reason: string;
}

export interface AccountHealthState {
  accountId: string;
  platform: string;
  status: "healthy" | "degraded" | "expired" | "challenge";
  reason?: string;
  checkedAt: string;
  /** Prefer publish/request traceId so Inbox surfaces the same id (F-B). */
  traceId?: string;
}

export interface DoctorDiagnosis {
  errorCode: string;
  summary: string;
  remediationStep: string;
  autoPauseTriggered: boolean;
}

export interface SandboxResult {
  accountId: string;
  platform: string;
  success: boolean;
  logs: string[];
  testedAt: string;
}
