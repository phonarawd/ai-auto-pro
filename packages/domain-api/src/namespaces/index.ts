import { SCHEMA_VERSION } from "@clime/shared";
import { createAsyncJobAck, generateJobId } from "../ipc/job-id.js";

export * from "./types.js";

/**
 * Creates default/stub handler implementations for all 14 namespaces in S3-A contract.
 * Allows Domain API host to serve all channels immediately out of the box.
 */
export function createDefaultDomainHandlers(): Record<
  string,
  (args: Record<string, unknown>, context: { traceId: string; projectId?: string | null }) => Promise<unknown>
> {
  return {
    // Growth
    "growth.getMissionToday": async (_args, _ctx) => ({
      schema_version: SCHEMA_VERSION,
      missions: [],
      queueDepth: 0,
    }),
    "growth.getDecision": async () => ({ schema_version: SCHEMA_VERSION, decision: null }),
    "growth.explainDecision": async () => ({ schema_version: SCHEMA_VERSION, explanation: "Default decision explanation" }),
    "growth.listPlannerQueue": async () => [],
    "growth.getKeywordGraph": async () => ({
      schema_version: SCHEMA_VERSION,
      kind: "growth.keyword_graph",
      projectId: "",
      updatedAt: new Date().toISOString(),
      nodes: [],
      edges: [],
    }),
    "growth.runResearchJob": async (_args, ctx) => createAsyncJobAck(generateJobId(), ctx.traceId),
    "growth.getNormalizedTrends": async () => ({ schema_version: SCHEMA_VERSION, trends: [] }),
    "growth.buildMultiJackHook": async () => ({
      schema_version: SCHEMA_VERSION,
      ok: false,
      code: "STUB",
      message: "Wire @clime/growth-research in desktop host",
    }),
    "growth.getBrandRules": async () => ({
      schema_version: SCHEMA_VERSION,
      kind: "growth.brand_rules",
      projectId: "",
      updatedAt: new Date().toISOString(),
      forbiddenPhrases: [],
      offBrandPhrases: [],
      requiredPhrases: [],
      message: "Wire @clime/growth-research in desktop host",
    }),
    "growth.setBrandRules": async () => ({
      schema_version: SCHEMA_VERSION,
      ok: false,
      code: "STUB",
      message: "Wire @clime/growth-research in desktop host",
    }),
    "growth.getPersonaPrefs": async () => ({
      schema_version: SCHEMA_VERSION,
      kind: "growth.persona_prefs",
      projectId: "",
      updatedAt: new Date().toISOString(),
      personas: [],
      emotions: [],
      message: "Wire @clime/growth-research in desktop host",
    }),
    "growth.setPersonaPrefs": async () => ({
      schema_version: SCHEMA_VERSION,
      ok: false,
      code: "STUB",
      message: "Wire @clime/growth-research in desktop host",
    }),
    "growth.runResearcherJob": async (_args, ctx) =>
      createAsyncJobAck(generateJobId(), ctx.traceId),
    "growth.runCompetitorTeardown": async () => ({
      schema_version: SCHEMA_VERSION,
      ok: false,
      code: "STUB",
      message: "Wire @clime/growth-research in desktop host",
    }),
    "growth.runMicroAudit": async () => ({
      schema_version: SCHEMA_VERSION,
      ok: false,
      code: "STUB",
      message: "Wire @clime/growth-research in desktop host",
    }),
    "growth.getMicroAudit": async () => ({
      schema_version: SCHEMA_VERSION,
      audit: null,
      message: "Wire @clime/growth-research in desktop host",
    }),
    "growth.analyzeGap": async () => ({
      schema_version: SCHEMA_VERSION,
      kind: "growth.gap_analysis",
      id: "",
      projectId: "",
      gaps: [],
      keywordGaps: [],
      createdAt: new Date().toISOString(),
      message: "Wire @clime/growth-research in desktop host",
    }),
    "growth.scoreOpportunity": async () => ({
      schema_version: SCHEMA_VERSION,
      kind: "growth.opportunity_score",
      id: "",
      projectId: "",
      opportunities: [],
      createdAt: new Date().toISOString(),
      message: "Wire @clime/growth-research in desktop host",
    }),
    "growth.analyzeViral": async () => ({
      schema_version: SCHEMA_VERSION,
      kind: "growth.viral_signal",
      id: "",
      projectId: "",
      signals: [],
      paidApiRequired: false as const,
      createdAt: new Date().toISOString(),
      message: "Wire @clime/growth-research in desktop host",
    }),
    "growth.exportMicroAuditViral": async () => ({
      schema_version: SCHEMA_VERSION,
      ok: false,
      code: "STUB",
      message: "Wire @clime/growth-research in desktop host",
    }),
    "growth.buildMultiJackPack": async () => ({
      schema_version: SCHEMA_VERSION,
      ok: false,
      code: "STUB",
      message: "Wire @clime/growth-research in desktop host",
    }),
    "growth.generateTopic": async (_args, ctx) => ({
      schema_version: SCHEMA_VERSION,
      kind: "growth.topic_generate_result",
      projectId: "",
      topics: [],
      traceId: ctx.traceId,
    }),
    "growth.estimateRevenue": async () => ({
      schema_version: SCHEMA_VERSION,
      estimates: [],
      isEstimate: true as const,
      estimateLabel: "추정" as const,
      message: "Wire @clime/growth-revenue in desktop host",
    }),
    "growth.prioritizeRevenue": async () => ({
      schema_version: SCHEMA_VERSION,
      kind: "growth.revenue_prioritizer_result",
      projectId: "",
      ranked: [],
      isEstimate: true as const,
      estimateLabel: "추정" as const,
      rankedAt: new Date().toISOString(),
      message: "Wire @clime/growth-revenue in desktop host",
    }),
    "growth.runDailyDecision": async () => ({
      schema_version: SCHEMA_VERSION,
      ok: false,
      message: "Wire @clime/growth-decision in desktop host",
    }),

    // Content
    "content.enqueueGenerate": async (_args, ctx) => createAsyncJobAck(generateJobId(), ctx.traceId),
    "content.getArtifact": async (args) => ({
      schema_version: SCHEMA_VERSION,
      artifactId: typeof args.artifactId === "string" ? args.artifactId : "stub",
      content: "",
    }),
    "content.validate": async () => ({ schema_version: SCHEMA_VERSION, valid: true }),
    "content.optimize": async (_args, ctx) => createAsyncJobAck(generateJobId(), ctx.traceId),
    "content.repurpose": async (_args, ctx) => createAsyncJobAck(generateJobId(), ctx.traceId),
    "content.exportPack": async () => ({ schema_version: SCHEMA_VERSION, exportPath: "Exports/stub" }),
    "content.listHistory": async () => [],

    // Analytics
    "analytics.getFunnel": async () => ({ schema_version: SCHEMA_VERSION, stages: [] }),
    "analytics.getRoi": async () => ({ schema_version: SCHEMA_VERSION, roi: 0 }),
    "analytics.listExperiments": async () => [],
    "analytics.createExperiment": async () => ({
      schema_version: SCHEMA_VERSION,
      kind: "analytics.create_experiment_result",
      ok: false,
      humanGateRequired: false,
      autoSpendApplied: 0,
      spendRequested: null,
      message: "Wire @clime/analytics in desktop host",
    }),
    "analytics.runSimulation": async (_args, ctx) => createAsyncJobAck(generateJobId(), ctx.traceId),
    "analytics.importMetrics": async () => ({ schema_version: SCHEMA_VERSION, importedCount: 0 }),

    // Account
    "account.listAccounts": async () => [],
    "account.connect": async () => ({ schema_version: SCHEMA_VERSION, accountId: "acc_stub" }),
    "account.disconnect": async () => ({ schema_version: SCHEMA_VERSION, disconnected: true }),
    "account.getMatrix": async () => ({ schema_version: SCHEMA_VERSION, canPublish: true, publishMode: "api" as const, riskLevel: "low" as const }),
    "account.route": async () => ({ schema_version: SCHEMA_VERSION, targetAccount: "default" }),
    "account.health": async () => ({ schema_version: SCHEMA_VERSION, status: "healthy" as const }),
    "account.sandboxTest": async () => ({ schema_version: SCHEMA_VERSION, passed: true }),
    "account.importUrl": async () => ({ schema_version: SCHEMA_VERSION, profileId: "prof_stub" }),
    "account.wizardProgress": async () => ({ schema_version: SCHEMA_VERSION, step: 1, completed: false }),
    "account.pausePublish": async () => ({ schema_version: SCHEMA_VERSION, paused: true }),
    "account.resumePublish": async () => ({ schema_version: SCHEMA_VERSION, resumed: true }),
    "account.publish": async (_args, ctx) =>
      createAsyncJobAck(generateJobId(), ctx.traceId),

    // Executive (stubs — desktop host overrides with @clime/meta handlers)
    "executive.getGoals": async () => [],
    "executive.setGoal": async () => ({ schema_version: SCHEMA_VERSION, goalId: "goal_stub" }),
    "executive.getHorizon": async () => ({ schema_version: SCHEMA_VERSION, status: "active" }),
    "executive.explainDecision": async () => ({ schema_version: SCHEMA_VERSION, explanation: "Executive explanation" }),
    "executive.getReallocations": async () => [],
    "executive.linkMission": async () => ({
      schema_version: SCHEMA_VERSION,
      linked: false,
      goalId: "goal_stub",
    }),
    "executive.getGoalChain": async () => null,

    // Workflow
    "workflow.listTemplates": async () => [],
    "workflow.getTemplate": async (args) => ({
      schema_version: SCHEMA_VERSION,
      templateId: typeof args.templateId === "string" ? args.templateId : "stub",
    }),
    "workflow.createRun": async () => ({ schema_version: SCHEMA_VERSION, workflowRunId: "run_stub", state: "QUEUED" }),
    "workflow.getRun": async (args) => ({
      schema_version: SCHEMA_VERSION,
      workflowRunId: typeof args.workflowRunId === "string" ? args.workflowRunId : "stub",
      state: "QUEUED",
    }),
    "workflow.listRuns": async () => [],
    "workflow.resumeRun": async () => ({ schema_version: SCHEMA_VERSION, resumed: true }),
    "workflow.cancelRun": async () => ({ schema_version: SCHEMA_VERSION, cancelled: true }),
    "workflow.exportClimePlaybook": async () => ({
      schema_version: SCHEMA_VERSION,
      ok: false,
      code: "STUB",
      message: "Wire @clime/workflow in desktop host",
    }),
    "workflow.importClimePlaybook": async () => ({
      schema_version: SCHEMA_VERSION,
      ok: false,
      code: "STUB",
      message: "Wire @clime/workflow in desktop host",
    }),

    // Automation
    "automation.startMission": async (_args, ctx) => createAsyncJobAck(generateJobId(), ctx.traceId, { plannerQueueItemId: "pq_stub" }),
    "automation.getQueueDepth": async () => ({ schema_version: SCHEMA_VERSION, depth: 0 }),
    "automation.getWorkerStatus": async () => ({ schema_version: SCHEMA_VERSION, activeWorkers: 0 }),
    "automation.listQueue": async () => [],
    "automation.cancelJob": async (args) => ({
      schema_version: SCHEMA_VERSION,
      jobId: typeof args.jobId === "string" ? args.jobId : "job_stub",
      terminalState: "CANCELLED",
    }),

    // Knowledge
    "knowledge.list": async () => [],
    "knowledge.get": async (args) => ({
      schema_version: SCHEMA_VERSION,
      key: typeof args.key === "string" ? args.key : "stub",
      value: null,
    }),
    "knowledge.search": async () => [],
    "knowledge.put": async () => ({ schema_version: SCHEMA_VERSION, saved: true }),
    "knowledge.delete": async () => ({ schema_version: SCHEMA_VERSION, deleted: true }),

    // Memory
    "memory.listEpisodes": async () => [],
    "memory.getEpisode": async (args) => ({
      schema_version: SCHEMA_VERSION,
      episodeId: typeof args.episodeId === "string" ? args.episodeId : "stub",
    }),
    "memory.search": async () => [],
    "memory.recordEpisode": async () => ({
      schema_version: SCHEMA_VERSION,
      ok: false,
      message: "stub — wire @clime/memory",
    }),

    // Learning
    "learning.listPolicies": async () => [],
    "learning.getPolicy": async (args) => ({
      schema_version: SCHEMA_VERSION,
      policyId: typeof args.policyId === "string" ? args.policyId : "stub",
    }),
    "learning.acceptProposal": async () => ({ schema_version: SCHEMA_VERSION, accepted: true }),
    "learning.rejectProposal": async () => ({ schema_version: SCHEMA_VERSION, rejected: true }),
    "learning.getConfidence": async () => ({
      schema_version: SCHEMA_VERSION,
      score: 1.0,
      threshold: 0.91,
    }),
    "learning.listReflections": async () => [],
    "learning.proposeFromRoi": async () => ({
      schema_version: SCHEMA_VERSION,
      kind: "learning.propose_from_roi_result",
      ok: false,
      autoPromoted: false,
      threshold: 0.91,
      message: "stub — wire @clime/learning",
    }),
    "learning.runReflection": async () => ({
      schema_version: SCHEMA_VERSION,
      ok: false,
      message: "stub — wire @clime/learning",
    }),

    // Governance
    "governance.getFeatures": async () => ({ schema_version: SCHEMA_VERSION, features: [] }),
    "governance.getPolicies": async () => ({ schema_version: SCHEMA_VERSION, policies: [] }),
    "governance.getKillSwitch": async () => ({ schema_version: SCHEMA_VERSION, active: false }),
    "governance.getRuntimeStatus": async () => ({ schema_version: SCHEMA_VERSION, status: "operational" }),
    "governance.setFeature": async () => ({ schema_version: SCHEMA_VERSION, updated: true }),
    "governance.setPolicy": async () => ({ schema_version: SCHEMA_VERSION, updated: true }),
    "governance.activateKillSwitch": async () => ({ schema_version: SCHEMA_VERSION, active: true }),
    "governance.clearKillSwitch": async () => ({ schema_version: SCHEMA_VERSION, active: false }),

    // Settings
    "settings.getGlobal": async () => ({ schema_version: SCHEMA_VERSION }),
    "settings.setGlobal": async () => ({ schema_version: SCHEMA_VERSION, saved: true }),
    "settings.getProject": async () => ({ schema_version: SCHEMA_VERSION }),
    "settings.setProject": async () => ({ schema_version: SCHEMA_VERSION, saved: true }),
    "settings.getUser": async () => ({ schema_version: SCHEMA_VERSION }),
    "settings.setUser": async () => ({ schema_version: SCHEMA_VERSION, saved: true }),

    // Notification
    "notification.listInbox": async () => [],
    "notification.markRead": async () => ({ schema_version: SCHEMA_VERSION, marked: true }),
    "notification.dismiss": async () => ({ schema_version: SCHEMA_VERSION, dismissed: true }),
    "notification.getToastPrefs": async () => ({ schema_version: SCHEMA_VERSION, enabled: true }),
    "notification.setToastPrefs": async () => ({ schema_version: SCHEMA_VERSION, saved: true }),

    // Tool
    "tool.listProfiles": async () => [],
    "tool.pickFile": async () => ({ schema_version: SCHEMA_VERSION, filePath: null }),
    "tool.pickDirectory": async () => ({ schema_version: SCHEMA_VERSION, dirPath: null }),
    "tool.runOcr": async (_args, ctx) => createAsyncJobAck(generateJobId(), ctx.traceId),
  };
}
