/**
 * Row DTOs — camelCase in TS, snake_case in SQL (s2-a §6).
 * Shapes match Drizzle `$inferSelect` on schema tables.
 */
import type {
  accountCredentialRef,
  analyticsSnapshot,
  auditEvent,
  connectorRegistration,
  contentItem,
  decisionRecord,
  eventOutbox,
  featureState,
  globalSettings,
  goal,
  killSwitchState,
  knowledgeItem,
  learningPolicy,
  mission,
  moduleRegistration,
  platformAccount,
  platformCapability,
  plannerQueueItem,
  policyRule,
  project,
  projectSettings,
  publishingHistoryEvent,
  sessionRecord,
  userSettings,
  workflowRun,
} from "../db/schema.js";

export type ProjectRow = typeof project.$inferSelect;
export type UserSettingsRow = typeof userSettings.$inferSelect;
export type GlobalSettingsRow = typeof globalSettings.$inferSelect;
export type ProjectSettingsRow = typeof projectSettings.$inferSelect;
export type PlatformAccountRow = typeof platformAccount.$inferSelect;
export type AccountCredentialRefRow = typeof accountCredentialRef.$inferSelect;
export type SessionRecordRow = typeof sessionRecord.$inferSelect;
export type PlatformCapabilityRow = typeof platformCapability.$inferSelect;
export type ConnectorRegistrationRow = typeof connectorRegistration.$inferSelect;
export type MissionRow = typeof mission.$inferSelect;
export type DecisionRecordRow = typeof decisionRecord.$inferSelect;
export type PlannerQueueItemRow = typeof plannerQueueItem.$inferSelect;
export type WorkflowRunRow = typeof workflowRun.$inferSelect;
export type ContentItemRow = typeof contentItem.$inferSelect;
export type PublishingHistoryEventRow =
  typeof publishingHistoryEvent.$inferSelect;
export type KnowledgeItemRow = typeof knowledgeItem.$inferSelect;
export type EventOutboxRow = typeof eventOutbox.$inferSelect;
export type AnalyticsSnapshotRow = typeof analyticsSnapshot.$inferSelect;
export type ModuleRegistrationRow = typeof moduleRegistration.$inferSelect;
export type FeatureStateRow = typeof featureState.$inferSelect;
export type PolicyRuleRow = typeof policyRule.$inferSelect;
export type KillSwitchStateRow = typeof killSwitchState.$inferSelect;
export type AuditEventRow = typeof auditEvent.$inferSelect;
export type LearningPolicyRow = typeof learningPolicy.$inferSelect;
export type GoalRow = typeof goal.$inferSelect;
