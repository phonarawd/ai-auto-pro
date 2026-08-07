import type { AsyncJobAck } from "../ipc/job-id.js";
import type { GovernanceAPI } from "@clime/feature-management";

/** Inbox row view model for NotificationAPI (B2) — Zod boundary lives in `@clime/notification`. */
export type InboxItemView = {
  schema_version: 1;
  id: string;
  kind: string;
  title: string;
  body: string;
  severity: "info" | "success" | "warning" | "danger";
  read: boolean;
  dismissed: boolean;
  createdAt: string;
  traceId?: string;
  jobId?: string;
  accountId?: string;
  platform?: string;
  terminalState?: "PAUSED_CHALLENGE";
  actions?: Array<{ id: string; label: string; kind: string }>;
};

export type MethodKind = "Q" | "C" | "A";

export interface MethodMetadata {
  kind: MethodKind;
  featureKey: string;
}

/**
 * Metadata map for all 14 namespaces and their methods.
 */
export const NAMESPACE_METHOD_METADATA: Record<string, Record<string, MethodMetadata>> = {
  growth: {
    getMissionToday: { kind: "Q", featureKey: "feature.growth.getMissionToday" },
    getDecision: { kind: "Q", featureKey: "feature.growth.getDecision" },
    explainDecision: { kind: "Q", featureKey: "feature.growth.explainDecision" },
    listPlannerQueue: { kind: "Q", featureKey: "feature.growth.listPlannerQueue" },
    getKeywordGraph: { kind: "Q", featureKey: "feature.growth.getKeywordGraph" },
    runResearchJob: { kind: "A", featureKey: "feature.growth.runResearchJob" },
    getNormalizedTrends: { kind: "Q", featureKey: "feature.growth.getNormalizedTrends" },
    buildMultiJackHook: { kind: "C", featureKey: "feature.growth.buildMultiJackHook" },
    getBrandRules: { kind: "Q", featureKey: "feature.growth.getBrandRules" },
    setBrandRules: { kind: "C", featureKey: "feature.growth.setBrandRules" },
    getPersonaPrefs: { kind: "Q", featureKey: "feature.growth.getPersonaPrefs" },
    setPersonaPrefs: { kind: "C", featureKey: "feature.growth.setPersonaPrefs" },
    runResearcherJob: { kind: "A", featureKey: "feature.growth.runResearcherJob" },
    runCompetitorTeardown: {
      kind: "C",
      featureKey: "feature.growth.runCompetitorTeardown",
    },
    runMicroAudit: { kind: "C", featureKey: "feature.growth.runMicroAudit" },
    getMicroAudit: { kind: "Q", featureKey: "feature.growth.getMicroAudit" },
    analyzeGap: { kind: "C", featureKey: "feature.growth.analyzeGap" },
    scoreOpportunity: { kind: "C", featureKey: "feature.growth.scoreOpportunity" },
    analyzeViral: { kind: "C", featureKey: "feature.growth.analyzeViral" },
    exportMicroAuditViral: {
      kind: "C",
      featureKey: "feature.growth.exportMicroAuditViral",
    },
    buildMultiJackPack: {
      kind: "C",
      featureKey: "feature.growth.buildMultiJackPack",
    },
    generateTopic: { kind: "C", featureKey: "feature.growth.generateTopic" },
    estimateRevenue: { kind: "C", featureKey: "feature.growth.estimateRevenue" },
    prioritizeRevenue: { kind: "C", featureKey: "feature.growth.prioritizeRevenue" },
    runDailyDecision: { kind: "C", featureKey: "feature.growth.runDailyDecision" },
  },
  content: {
    enqueueGenerate: { kind: "A", featureKey: "feature.content.enqueueGenerate" },
    getArtifact: { kind: "Q", featureKey: "feature.content.getArtifact" },
    validate: { kind: "C", featureKey: "feature.content.validate" },
    optimize: { kind: "A", featureKey: "feature.content.optimize" },
    repurpose: { kind: "A", featureKey: "feature.content.repurpose" },
    exportPack: { kind: "C", featureKey: "feature.content.exportPack" },
    listHistory: { kind: "Q", featureKey: "feature.content.listHistory" },
  },
  analytics: {
    getFunnel: { kind: "Q", featureKey: "feature.analytics.getFunnel" },
    getRoi: { kind: "Q", featureKey: "feature.analytics.getRoi" },
    listExperiments: { kind: "Q", featureKey: "feature.analytics.listExperiments" },
    createExperiment: { kind: "C", featureKey: "feature.analytics.createExperiment" },
    runSimulation: { kind: "A", featureKey: "feature.analytics.runSimulation" },
    importMetrics: { kind: "C", featureKey: "feature.analytics.importMetrics" },
  },
  account: {
    listAccounts: { kind: "Q", featureKey: "feature.account.listAccounts" },
    connect: { kind: "C", featureKey: "feature.account.connect" },
    disconnect: { kind: "C", featureKey: "feature.account.disconnect" },
    getMatrix: { kind: "Q", featureKey: "feature.account.getMatrix" },
    route: { kind: "Q", featureKey: "feature.account.route" },
    health: { kind: "Q", featureKey: "feature.account.health" },
    sandboxTest: { kind: "C", featureKey: "feature.account.sandboxTest" },
    importUrl: { kind: "C", featureKey: "feature.account.importUrl" },
    wizardProgress: { kind: "Q", featureKey: "feature.account.wizardProgress" },
    pausePublish: { kind: "C", featureKey: "feature.account.pausePublish" },
    resumePublish: { kind: "C", featureKey: "feature.account.resumePublish" },
    /** C2 Publish ladder — Matrix selects api|session (feature seed: publish.api / publish.session). */
    publish: { kind: "A", featureKey: "feature.publish.api" },
  },
  executive: {
    getGoals: { kind: "Q", featureKey: "feature.executive.getGoals" },
    setGoal: { kind: "C", featureKey: "feature.executive.setGoal" },
    getHorizon: { kind: "Q", featureKey: "feature.executive.getHorizon" },
    explainDecision: { kind: "Q", featureKey: "feature.executive.explainDecision" },
    getReallocations: { kind: "Q", featureKey: "feature.executive.getReallocations" },
    linkMission: { kind: "C", featureKey: "feature.executive.linkMission" },
    getGoalChain: { kind: "Q", featureKey: "feature.executive.getGoalChain" },
  },
  workflow: {
    listTemplates: { kind: "Q", featureKey: "feature.workflow.listTemplates" },
    getTemplate: { kind: "Q", featureKey: "feature.workflow.getTemplate" },
    createRun: { kind: "C", featureKey: "feature.workflow.createRun" },
    getRun: { kind: "Q", featureKey: "feature.workflow.getRun" },
    listRuns: { kind: "Q", featureKey: "feature.workflow.listRuns" },
    resumeRun: { kind: "C", featureKey: "feature.workflow.resumeRun" },
    cancelRun: { kind: "C", featureKey: "feature.workflow.cancelRun" },
    exportClimePlaybook: {
      kind: "C",
      featureKey: "feature.workflow.exportClimePlaybook",
    },
    importClimePlaybook: {
      kind: "C",
      featureKey: "feature.workflow.importClimePlaybook",
    },
  },
  automation: {
    startMission: { kind: "A", featureKey: "feature.automation.startMission" },
    getQueueDepth: { kind: "Q", featureKey: "feature.automation.getQueueDepth" },
    getWorkerStatus: { kind: "Q", featureKey: "feature.automation.getWorkerStatus" },
    listQueue: { kind: "Q", featureKey: "feature.automation.listQueue" },
    cancelJob: { kind: "C", featureKey: "feature.automation.cancelJob" },
  },
  knowledge: {
    list: { kind: "Q", featureKey: "feature.knowledge.list" },
    get: { kind: "Q", featureKey: "feature.knowledge.get" },
    search: { kind: "Q", featureKey: "feature.knowledge.search" },
    put: { kind: "C", featureKey: "feature.knowledge.put" },
    delete: { kind: "C", featureKey: "feature.knowledge.delete" },
  },
  memory: {
    listEpisodes: { kind: "Q", featureKey: "feature.memory.listEpisodes" },
    getEpisode: { kind: "Q", featureKey: "feature.memory.getEpisode" },
    search: { kind: "Q", featureKey: "feature.memory.search" },
    recordEpisode: { kind: "C", featureKey: "feature.memory.recordEpisode" },
  },
  learning: {
    listPolicies: { kind: "Q", featureKey: "feature.learning.listPolicies" },
    getPolicy: { kind: "Q", featureKey: "feature.learning.getPolicy" },
    acceptProposal: { kind: "C", featureKey: "feature.learning.acceptProposal" },
    rejectProposal: { kind: "C", featureKey: "feature.learning.rejectProposal" },
    getConfidence: { kind: "Q", featureKey: "feature.learning.getConfidence" },
    listReflections: { kind: "Q", featureKey: "feature.learning.listReflections" },
    proposeFromRoi: { kind: "C", featureKey: "feature.learning.proposeFromRoi" },
    runReflection: { kind: "C", featureKey: "feature.learning.runReflection" },
  },
  governance: {
    getFeatures: { kind: "Q", featureKey: "feature.governance.getFeatures" },
    getPolicies: { kind: "Q", featureKey: "feature.governance.getPolicies" },
    getKillSwitch: { kind: "Q", featureKey: "feature.governance.getKillSwitch" },
    getRuntimeStatus: { kind: "Q", featureKey: "feature.governance.getRuntimeStatus" },
    setFeature: { kind: "C", featureKey: "feature.governance.setFeature" },
    setPolicy: { kind: "C", featureKey: "feature.governance.setPolicy" },
    activateKillSwitch: { kind: "C", featureKey: "feature.governance.activateKillSwitch" },
    clearKillSwitch: { kind: "C", featureKey: "feature.governance.clearKillSwitch" },
  },
  settings: {
    getGlobal: { kind: "Q", featureKey: "feature.settings.getGlobal" },
    setGlobal: { kind: "C", featureKey: "feature.settings.setGlobal" },
    getProject: { kind: "Q", featureKey: "feature.settings.getProject" },
    setProject: { kind: "C", featureKey: "feature.settings.setProject" },
    getUser: { kind: "Q", featureKey: "feature.settings.getUser" },
    setUser: { kind: "C", featureKey: "feature.settings.setUser" },
  },
  notification: {
    listInbox: { kind: "Q", featureKey: "feature.notification.listInbox" },
    markRead: { kind: "C", featureKey: "feature.notification.markRead" },
    dismiss: { kind: "C", featureKey: "feature.notification.dismiss" },
    getToastPrefs: { kind: "Q", featureKey: "feature.notification.getToastPrefs" },
    setToastPrefs: { kind: "C", featureKey: "feature.notification.setToastPrefs" },
  },
  tool: {
    listProfiles: { kind: "Q", featureKey: "feature.tool.listProfiles" },
    pickFile: { kind: "C", featureKey: "feature.tool.pickFile" },
    pickDirectory: { kind: "C", featureKey: "feature.tool.pickDirectory" },
    runOcr: { kind: "A", featureKey: "feature.tool.runOcr" },
  },
};

export interface DomainClientCallMeta {
  projectId?: string | null;
  traceId?: string;
  requestId?: string;
}

export type DomainClientMethod<TArgs = unknown, TResult = unknown> = (
  args?: TArgs,
  meta?: DomainClientCallMeta,
) => Promise<TResult>;

/**
 * DomainClient TypeScript shape exposing method groups for all 14 namespaces.
 */
export interface DomainClient {
  growth: {
    getMissionToday: DomainClientMethod<Record<string, never>, { schema_version: 1; missions: unknown[]; queueDepth: number }>;
    getDecision: DomainClientMethod<Record<string, never>, unknown>;
    explainDecision: DomainClientMethod<Record<string, never>, unknown>;
    listPlannerQueue: DomainClientMethod<Record<string, never>, unknown[]>;
    getKeywordGraph: DomainClientMethod<{ projectId?: string }, unknown>;
    runResearchJob: DomainClientMethod<{ topic?: string; projectId?: string }, AsyncJobAck>;
    getNormalizedTrends: DomainClientMethod<{ projectId?: string }, { schema_version: 1; trends: unknown[] }>;
    buildMultiJackHook: DomainClientMethod<
      { projectId?: string; trendId: string; personaHints?: string[] },
      unknown
    >;
    getBrandRules: DomainClientMethod<{ projectId?: string }, unknown>;
    setBrandRules: DomainClientMethod<
      {
        projectId?: string;
        tone?: string;
        voice?: string;
        forbiddenPhrases?: string[];
        offBrandPhrases?: string[];
        requiredPhrases?: string[];
      },
      unknown
    >;
    getPersonaPrefs: DomainClientMethod<{ projectId?: string }, unknown>;
    setPersonaPrefs: DomainClientMethod<
      {
        projectId?: string;
        personas?: string[];
        emotions?: string[];
        notes?: string;
      },
      unknown
    >;
    runResearcherJob: DomainClientMethod<{ projectId?: string }, AsyncJobAck>;
    runCompetitorTeardown: DomainClientMethod<
      { projectId?: string; targetUrl: string },
      unknown
    >;
    runMicroAudit: DomainClientMethod<
      {
        projectId?: string;
        sourceUrl: string;
        sourceKind?: "public_url" | "public_sns" | "public_rss" | "fixture";
        targetUrl?: string;
      },
      unknown
    >;
    getMicroAudit: DomainClientMethod<{ projectId?: string }, unknown>;
    analyzeGap: DomainClientMethod<{ projectId?: string }, unknown>;
    scoreOpportunity: DomainClientMethod<{ projectId?: string }, unknown>;
    analyzeViral: DomainClientMethod<{ projectId?: string }, unknown>;
    exportMicroAuditViral: DomainClientMethod<
      {
        projectId?: string;
        exportRoot: string;
        exportDate?: string;
        referralCode?: string;
        locale?: string;
      },
      unknown
    >;
    buildMultiJackPack: DomainClientMethod<
      { projectId?: string; trendId: string; personaHints?: string[] },
      unknown
    >;
    generateTopic: DomainClientMethod<
      {
        projectId?: string;
        missionId?: string | null;
        missionGoal?: string | null;
        decisionId?: string | null;
        decisionSummary?: string | null;
        trendIds?: string[];
        maxTopics?: number;
      },
      unknown
    >;
    estimateRevenue: DomainClientMethod<
      { projectId?: string; candidates?: unknown[] },
      unknown
    >;
    prioritizeRevenue: DomainClientMethod<
      { projectId?: string; candidates?: unknown[] },
      unknown
    >;
    runDailyDecision: DomainClientMethod<
      {
        projectId?: string;
        missionDate?: string;
        candidates?: unknown[];
        missionTitle?: string;
        horizonHint?: string;
      },
      unknown
    >;
  };
  content: {
    enqueueGenerate: DomainClientMethod<{ prompt: string }, AsyncJobAck>;
    getArtifact: DomainClientMethod<{ artifactId: string }, unknown>;
    validate: DomainClientMethod<{ artifactId: string }, { schema_version: 1; valid: boolean; errors?: string[] }>;
    optimize: DomainClientMethod<{ artifactId: string }, AsyncJobAck>;
    repurpose: DomainClientMethod<{ artifactId: string; targetFormat: string }, AsyncJobAck>;
    exportPack: DomainClientMethod<{ itemIds: string[] }, { schema_version: 1; exportPath: string }>;
    listHistory: DomainClientMethod<{ projectId?: string; limit?: number }, unknown[]>;
  };
  analytics: {
    getFunnel: DomainClientMethod<Record<string, never>, unknown>;
    getRoi: DomainClientMethod<Record<string, never>, unknown>;
    listExperiments: DomainClientMethod<
      { projectId?: string },
      unknown[]
    >;
    createExperiment: DomainClientMethod<
      {
        projectId?: string;
        name: string;
        spend?: number;
        humanApproved?: boolean;
        arms?: unknown[];
      },
      {
        schema_version: 1;
        ok: boolean;
        experimentId?: string;
        humanGateRequired: boolean;
        autoSpendApplied: 0;
        spendRequested?: number | null;
        terminal?: "BLOCKED_HUMAN";
        message?: string;
      }
    >;
    runSimulation: DomainClientMethod<{ params: Record<string, unknown> }, AsyncJobAck>;
    importMetrics: DomainClientMethod<{ data: unknown }, { schema_version: 1; importedCount: number }>;
  };
  account: {
    listAccounts: DomainClientMethod<Record<string, never>, unknown[]>;
    connect: DomainClientMethod<
      {
        projectId?: string;
        platform: string;
        accountName?: string;
        authMode?: "oauth" | "session" | "manual";
        /** Vault ref already created — preferred when no password is sent. */
        credentialRef?: string;
        /** Login id (email / handle). Sent with password; plaintext never returned. */
        username?: string;
        /** Password — vaulted in main; never persisted in Config/SQLite plaintext. */
        password?: string;
        metadata?: Record<string, unknown>;
      },
      {
        schema_version: 1;
        connectUrl?: string;
        accountId?: string;
        id?: string;
        platform?: string;
        accountName?: string;
        credentialRef?: string;
      }
    >;
    disconnect: DomainClientMethod<{ accountId: string }, { schema_version: 1; disconnected: boolean }>;
    getMatrix: DomainClientMethod<Record<string, never>, { schema_version: 1; canPublish: boolean; publishMode: "api" | "session"; riskLevel: "low" | "medium" | "high" }>;
    route: DomainClientMethod<{ action: string }, { schema_version: 1; targetAccount: string }>;
    health: DomainClientMethod<Record<string, never>, { schema_version: 1; status: "healthy" | "degraded" | "unhealthy" }>;
    sandboxTest: DomainClientMethod<{ platform: string }, { schema_version: 1; passed: boolean }>;
    importUrl: DomainClientMethod<{ url: string }, { schema_version: 1; profileId: string }>;
    wizardProgress: DomainClientMethod<
      { step?: string; completed?: boolean },
      { schema_version: 1; step: string; completed: boolean; updatedAt?: string }
    >;
    pausePublish: DomainClientMethod<{ accountId?: string }, { schema_version: 1; paused: boolean }>;
    resumePublish: DomainClientMethod<{ accountId?: string }, { schema_version: 1; resumed: boolean }>;
    publish: DomainClientMethod<
      {
        projectId?: string;
        contentItemId: string;
        accountId: string;
        platform?: string;
        skipJitter?: boolean;
      },
      | {
          schema_version: 1;
          ok: true;
          publishMode: "api" | "session";
          historyKind: "posted_api" | "posted_session";
          externalPostId: string;
          traceId: string;
        }
      | {
          schema_version: 1;
          ok: false;
          code: string;
          message: string;
          traceId: string;
          terminal?: string;
        }
      | AsyncJobAck
    >;
  };
  executive: {
    getGoals: DomainClientMethod<
      { projectId?: string; horizon?: "week" | "month" | "quarter" },
      unknown[]
    >;
    setGoal: DomainClientMethod<
      {
        projectId?: string;
        goalId?: string;
        horizon: "week" | "month" | "quarter";
        title?: string;
        name?: string;
        target?: number;
        theme?: string;
        kpis?: Array<{
          key: string;
          target: number;
          unit?: string;
          current?: number;
        }>;
        mixCaps?: Record<string, number>;
        status?: "active" | "paused" | "done" | "archived";
        notes?: string;
      },
      { schema_version: 1; goalId: string }
    >;
    getHorizon: DomainClientMethod<
      { projectId?: string; horizon?: "week" | "month" | "quarter" },
      unknown
    >;
    explainDecision: DomainClientMethod<
      { projectId?: string; decisionId?: string },
      unknown
    >;
    getReallocations: DomainClientMethod<
      { projectId?: string; horizon?: "week" | "month" | "quarter" },
      unknown
    >;
    linkMission: DomainClientMethod<
      { goalId: string; missionId: string; title?: string },
      { schema_version: 1; linked: boolean; goalId: string }
    >;
    getGoalChain: DomainClientMethod<{ goalId: string }, unknown>;
  };
  workflow: {
    listTemplates: DomainClientMethod<Record<string, never>, unknown[]>;
    getTemplate: DomainClientMethod<{ templateId: string }, unknown>;
    createRun: DomainClientMethod<{ templateId: string }, { schema_version: 1; workflowRunId: string; state: "QUEUED" }>;
    getRun: DomainClientMethod<{ workflowRunId: string }, unknown>;
    listRuns: DomainClientMethod<Record<string, never>, unknown[]>;
    resumeRun: DomainClientMethod<{ workflowRunId: string }, { schema_version: 1; resumed: boolean }>;
    cancelRun: DomainClientMethod<{ workflowRunId: string }, { schema_version: 1; cancelled: boolean }>;
    exportClimePlaybook: DomainClientMethod<
      {
        title: string;
        summary?: string;
        filePath?: string;
        referralCode?: string;
        includeReferral?: boolean;
      },
      unknown
    >;
    importClimePlaybook: DomainClientMethod<
      { filePath?: string; playbook?: unknown },
      unknown
    >;
  };
  automation: {
    startMission: DomainClientMethod<{ missionId?: string; templateId?: string }, AsyncJobAck>;
    getQueueDepth: DomainClientMethod<Record<string, never>, { schema_version: 1; depth: number }>;
    getWorkerStatus: DomainClientMethod<Record<string, never>, { schema_version: 1; activeWorkers: number }>;
    listQueue: DomainClientMethod<Record<string, never>, unknown[]>;
    cancelJob: DomainClientMethod<{ jobId: string }, { schema_version: 1; jobId: string; terminalState: "CANCELLED" }>;
  };
  knowledge: {
    list: DomainClientMethod<
      {
        projectId?: string;
        namespace?: string;
        type?: string;
        tags?: string[];
      },
      unknown[]
    >;
    get: DomainClientMethod<
      { projectId?: string; id?: string; key?: string },
      unknown
    >;
    search: DomainClientMethod<
      {
        projectId?: string;
        query: string;
        namespace?: string;
        type?: string;
        tags?: string[];
      },
      unknown[]
    >;
    put: DomainClientMethod<
      {
        projectId?: string;
        id?: string;
        namespace: string;
        type?: string;
        key?: string;
        tags?: string[];
        body?: unknown;
        value?: unknown;
        blobRef?: string | null;
      },
      { schema_version: 1; saved: boolean; id?: string }
    >;
    delete: DomainClientMethod<
      { projectId?: string; id?: string; key?: string },
      { schema_version: 1; deleted: boolean }
    >;
  };
  memory: {
    listEpisodes: DomainClientMethod<
      { projectId?: string; episodeKind?: string; horizon?: string },
      unknown[]
    >;
    getEpisode: DomainClientMethod<
      { episodeId: string; projectId?: string },
      unknown
    >;
    search: DomainClientMethod<{ query: string; projectId?: string }, unknown[]>;
    recordEpisode: DomainClientMethod<
      {
        projectId?: string;
        episodeKind?: string;
        summary: string;
        facts?: Record<string, unknown>;
        horizon?: string;
      },
      unknown
    >;
  };
  learning: {
    listPolicies: DomainClientMethod<{ projectId?: string }, unknown[]>;
    getPolicy: DomainClientMethod<{ policyId: string }, unknown>;
    acceptProposal: DomainClientMethod<
      { proposalId: string },
      { schema_version: 1; accepted: boolean }
    >;
    rejectProposal: DomainClientMethod<
      { proposalId: string },
      { schema_version: 1; rejected: boolean }
    >;
    getConfidence: DomainClientMethod<
      { projectId?: string },
      { schema_version: 1; score: number; threshold?: number }
    >;
    listReflections: DomainClientMethod<{ projectId?: string }, unknown[]>;
    proposeFromRoi: DomainClientMethod<Record<string, unknown>, unknown>;
    runReflection: DomainClientMethod<Record<string, unknown>, unknown>;
  };
  governance: {
    getFeatures: DomainClientMethod<Record<string, never>, ReturnType<GovernanceAPI["getFeatures"]>>;
    getPolicies: DomainClientMethod<Record<string, never>, ReturnType<GovernanceAPI["getPolicies"]>>;
    getKillSwitch: DomainClientMethod<Record<string, never>, ReturnType<GovernanceAPI["getKillSwitch"]>>;
    getRuntimeStatus: DomainClientMethod<Record<string, never>, ReturnType<GovernanceAPI["getRuntimeStatus"]>>;
    setFeature: DomainClientMethod<Parameters<GovernanceAPI["setFeature"]>[0], ReturnType<GovernanceAPI["setFeature"]>>;
    setPolicy: DomainClientMethod<Parameters<GovernanceAPI["setPolicy"]>[0], ReturnType<GovernanceAPI["setPolicy"]>>;
    activateKillSwitch: DomainClientMethod<Parameters<GovernanceAPI["activateKillSwitch"]>[0], ReturnType<GovernanceAPI["activateKillSwitch"]>>;
    clearKillSwitch: DomainClientMethod<Parameters<GovernanceAPI["clearKillSwitch"]>[0], ReturnType<GovernanceAPI["clearKillSwitch"]>>;
  };
  settings: {
    getGlobal: DomainClientMethod<
      { projectId?: string; userKey?: string },
      {
        schema_version: 1;
        scope: "global";
        items: Array<{
          key: string;
          kind: "value" | "ref";
          value?: unknown;
          ref?: string;
          effectiveSource?: "global" | "project" | "user";
        }>;
      }
    >;
    setGlobal: DomainClientMethod<
      { key: string; value: unknown },
      { schema_version: 1; saved: boolean; code?: string; message?: string }
    >;
    getProject: DomainClientMethod<
      { projectId?: string; userKey?: string },
      {
        schema_version: 1;
        scope: "project";
        items: Array<{
          key: string;
          kind: "value" | "ref";
          value?: unknown;
          ref?: string;
          effectiveSource?: "global" | "project" | "user";
        }>;
      }
    >;
    setProject: DomainClientMethod<
      { key: string; value: unknown; projectId?: string },
      { schema_version: 1; saved: boolean; code?: string; message?: string }
    >;
    getUser: DomainClientMethod<
      { projectId?: string; userKey?: string },
      {
        schema_version: 1;
        scope: "user";
        items: Array<{
          key: string;
          kind: "value" | "ref";
          value?: unknown;
          ref?: string;
          effectiveSource?: "global" | "project" | "user";
        }>;
      }
    >;
    setUser: DomainClientMethod<
      { key: string; value: unknown; userKey?: string },
      { schema_version: 1; saved: boolean; code?: string; message?: string }
    >;
  };
  notification: {
    listInbox: DomainClientMethod<Record<string, never>, InboxItemView[]>;
    markRead: DomainClientMethod<{ itemId: string }, { schema_version: 1; marked: boolean }>;
    dismiss: DomainClientMethod<{ itemId: string }, { schema_version: 1; dismissed: boolean }>;
    getToastPrefs: DomainClientMethod<
      Record<string, never>,
      { schema_version: 1; enabled: boolean; soundEnabled?: boolean; challengeAlwaysInbox?: true }
    >;
    setToastPrefs: DomainClientMethod<
      { prefs?: Record<string, unknown>; enabled?: boolean; soundEnabled?: boolean },
      { schema_version: 1; saved: boolean }
    >;
    /**
     * Preload-only: subscribe to allowlisted `domain:notification.push`.
     * Not an IPC invoke method — renderer bus subscribe remains 0.
     */
    subscribePush: (callback: (item: InboxItemView) => void) => () => void;
  };
  tool: {
    listProfiles: DomainClientMethod<Record<string, never>, unknown[]>;
    pickFile: DomainClientMethod<{ filters?: string[] }, { schema_version: 1; filePath: string | null }>;
    pickDirectory: DomainClientMethod<Record<string, never>, { schema_version: 1; dirPath: string | null }>;
    runOcr: DomainClientMethod<{ filePath: string }, AsyncJobAck>;
  };
}
