import {
  createAccountDomainHandlers,
  createAccountManager,
} from "@clime/account";
import {
  createAnalyticsDomainHandlers,
  createAnalyticsEngine,
} from "@clime/analytics";
import {
  createAutomationDomainHandlers,
  createAutomationRuntime,
  type AutomationRuntime,
} from "@clime/automation";
import {
  adaptAccountManagerToPublishPort,
  adaptContentEngineToPublishPort,
  createPublishDomainHandlers,
  createPublishLadder,
  createStubBrowserDriver,
  type BrowserDriver,
} from "@clime/browser-automation";
import {
  createConfigStore,
  createSettingsDomainHandlers,
} from "@clime/config";
import {
  createContentDomainHandlers,
  createContentEngine,
} from "@clime/content";
import {
  createAsyncJobAck,
  createDomainHost,
  generateJobId,
  NOTIFICATION_PUSH_CHANNEL,
  registerDomainIpcHandlers,
  type IpcMainLike,
} from "@clime/domain-api";
import {
  createDecisionDomainHandlers,
  createDecisionEngine,
} from "@clime/growth-decision";
import {
  createKnowledgeDomainHandlers,
  createKnowledgeStore,
} from "@clime/growth-knowledge";
import {
  createPlanningDomainHandlers,
  createTopicGeneratorEngine,
} from "@clime/growth-planning";
import {
  createResearchDomainHandlers,
  createResearchEngine,
  toValidateBrandRules,
} from "@clime/growth-research";
import {
  createRevenueDomainHandlers,
  createRevenueEngine,
} from "@clime/growth-revenue";
import {
  createLearningDomainHandlers,
  createLearningEngine,
} from "@clime/learning";
import {
  createMemoryDomainHandlers,
  createMemoryEngine,
} from "@clime/memory";
import {
  createExecutiveDomainHandlers,
  createExecutiveEngine,
  createGoalManager,
} from "@clime/meta";
import {
  createNotificationDomainHandlers,
  createNotificationRuntime,
  publishPlannerItemEnqueued,
} from "@clime/notification";
import { createObservability } from "@clime/observability";
import {
  createSqliteStorage,
  SEED_IDS,
  type SqliteStorage,
} from "@clime/storage";
import { createToolDomainHandlers, createToolEngine } from "@clime/tool";
import {
  createOsKeychainMasterKeyProvider,
  createVault,
  type Vault,
} from "@clime/vault";
import {
  createWorkflowDomainHandlers,
  createWorkflowEngine,
} from "@clime/workflow";

export type DesktopDomainApiBootstrapOptions = {
  /** Inject BAE driver (tests: alwaysChallenge for F-B E2E). */
  browserDriver?: BrowserDriver;
  /** SQLite path. Default `:memory:` (tests). Electron main passes userData file. */
  dbPath?: string;
  /**
   * Encrypted vault root under userData. When omitted, in-memory vault (tests).
   * Passwords from UI are putSecret'd here before account.connect stores credentialRef.
   */
  vaultRootDir?: string;
};

export type DesktopDomainApiBootstrap = {
  host: ReturnType<typeof createDomainHost>;
  observability: ReturnType<typeof createObservability>;
  accountManager: ReturnType<typeof createAccountManager>;
  notificationManager: ReturnType<typeof createNotificationRuntime>["notificationManager"];
  accountEventBus: ReturnType<typeof createNotificationRuntime>["accountEventBus"];
  automation: AutomationRuntime;
  storage: SqliteStorage;
  researchEngine: ReturnType<typeof createResearchEngine>;
  contentEngine: ReturnType<typeof createContentEngine>;
  stopForwarder: () => void;
  /** Register Electron webContents.send for Inbox push (optional in unit tests). */
  attachPushTarget: (send: (channel: string, payload: unknown) => void) => void;
  /** Stop workers/buses and close SQLite — await in tests to avoid race with seed. */
  close: () => Promise<void>;
};

/**
 * Main-process entry: registers allowlisted `domain:*` IPC handlers only.
 * Renderer must use preload DomainClient — no direct engine/bus access.
 * B3: START → Planner Queue (real) → jobId ack; Workers separate from IPC.
 */
export function bootstrapDesktopDomainApi(
  ipcMain: IpcMainLike,
  options?: DesktopDomainApiBootstrapOptions,
): DesktopDomainApiBootstrap {
  const observability = createObservability();
  const runtime = createNotificationRuntime();
  const accountManager = createAccountManager({ eventBus: runtime.accountEventBus });

  const vault: Vault = options?.vaultRootDir
    ? createVault({
        backend: "encrypted-file",
        rootDir: options.vaultRootDir,
        masterKeyProvider: createOsKeychainMasterKeyProvider(
          "clime-growth-studio",
          "vault-master",
        ),
      })
    : createVault({ backend: "memory" });

  const storage = createSqliteStorage({
    path: options?.dbPath ?? ":memory:",
  });
  let seedReady: Promise<void> | null = null;
  let closed = false;
  const ensureSeeded = () => {
    if (closed) return Promise.resolve();
    seedReady ??= storage.seedDefaults().then(() => undefined);
    return seedReady;
  };

  const automation = createAutomationRuntime({ storage });
  const workflowEngine = createWorkflowEngine(storage);
  const researchEngine = createResearchEngine(storage);
  const contentEngine = createContentEngine(storage, {
    loadBrandRules: async (projectId) => {
      const doc = await researchEngine.getBrandRules(projectId);
      return toValidateBrandRules(doc);
    },
  });
  const topicGenerator = createTopicGeneratorEngine(researchEngine);
  const revenueEngine = createRevenueEngine();
  const decisionEngine = createDecisionEngine(storage, { revenue: revenueEngine });
  const analyticsEngine = createAnalyticsEngine(storage);
  const memoryEngine = createMemoryEngine(storage);
  const learningEngine = createLearningEngine(storage);
  const goalManager = createGoalManager(storage);
  const executiveEngine = createExecutiveEngine(storage, goalManager);
  const configStore = createConfigStore({ settings: storage.settings });
  const knowledgeStore = createKnowledgeStore(storage);
  const toolEngine = createToolEngine();

  const publishLadder = createPublishLadder({
    content: adaptContentEngineToPublishPort(contentEngine),
    account: adaptAccountManagerToPublishPort(accountManager),
    browserDriver: options?.browserDriver ?? createStubBrowserDriver(),
  });
  const publishHandlers = createPublishDomainHandlers(publishLadder, {
    generateJobId,
  });

  let pushSend: ((channel: string, payload: unknown) => void) | undefined;
  runtime.notificationManager.setPushHandler((item) => {
    pushSend?.(NOTIFICATION_PUSH_CHANNEL, item);
  });

  const onEnqueued = async (ack: {
    jobId: string;
    traceId: string;
    plannerQueueItemId: string;
    missionId?: string;
  }) => {
    await publishPlannerItemEnqueued(runtime.buses, {
      jobId: ack.jobId,
      traceId: ack.traceId,
      plannerQueueItemId: ack.plannerQueueItemId,
      missionId: ack.missionId,
    });
  };

  const automationHandlers = createAutomationDomainHandlers(automation, {
    generateJobId,
    defaultProjectId: SEED_IDS.emptyProject,
    onEnqueued,
  });

  const revenueHandlers = createRevenueDomainHandlers(revenueEngine, {
    defaultProjectId: SEED_IDS.emptyProject,
  });
  const decisionHandlers = createDecisionDomainHandlers(decisionEngine, {
    defaultProjectId: SEED_IDS.emptyProject,
  });
  const analyticsHandlers = createAnalyticsDomainHandlers(analyticsEngine, {
    defaultProjectId: SEED_IDS.emptyProject,
  });
  const memoryHandlers = createMemoryDomainHandlers(memoryEngine, {
    defaultProjectId: SEED_IDS.emptyProject,
  });
  const learningHandlers = createLearningDomainHandlers(
    learningEngine,
    memoryEngine,
    { defaultProjectId: SEED_IDS.emptyProject },
  );
  const executiveHandlers = createExecutiveDomainHandlers(
    executiveEngine,
    goalManager,
    { defaultProjectId: SEED_IDS.emptyProject },
  );
  const settingsHandlers = createSettingsDomainHandlers(configStore, {
    defaultProjectId: SEED_IDS.emptyProject,
    defaultUserKey: "local",
  });
  const knowledgeHandlers = createKnowledgeDomainHandlers(knowledgeStore, {
    defaultProjectId: SEED_IDS.emptyProject,
  });
  const toolHandlers = createToolDomainHandlers(toolEngine, {
    generateJobId,
  });

  const withSeed = <
    TArgs extends Record<string, unknown>,
    TCtx extends { requestId: string; traceId: string; projectId?: string | null },
  >(
    handler: (args: TArgs, ctx: TCtx) => Promise<unknown>,
  ) => {
    return async (args: TArgs, ctx: TCtx) => {
      await ensureSeeded();
      return handler(args, ctx);
    };
  };

  const importAccountSafe = (record: {
    id: string;
    projectId: string;
    platform: string;
    accountName: string;
    authMode: string;
    credentialRef?: string;
    metadata?: Record<string, unknown>;
    createdAt?: string;
  }) => {
    const mgr = accountManager as {
      importConnectedAccount?: (r: typeof record) => void;
      connectAccount: (input: {
        projectId: string;
        platform: string;
        accountName: string;
        authMode: "oauth" | "session" | "manual";
        credentialRef?: string;
        metadata?: Record<string, unknown>;
      }) => { id: string };
      disconnectAccount: (id: string) => unknown;
      listAccounts: (projectId?: string) => Array<{ id: string }>;
    };
    if (typeof mgr.importConnectedAccount === "function") {
      mgr.importConnectedAccount(record);
      return;
    }
    // Packaged asar may ship an older @clime/account — restore via connectAccount.
    const existing = mgr
      .listAccounts("all")
      .some(
        (a) =>
          a.id === record.id ||
          ((a as { platform?: string; accountName?: string }).platform ===
            record.platform &&
            (a as { accountName?: string }).accountName === record.accountName),
      );
    if (existing) return;
    mgr.connectAccount({
      projectId: record.projectId,
      platform: record.platform,
      accountName: record.accountName,
      authMode: (record.authMode as "oauth" | "session" | "manual") || "session",
      credentialRef: record.credentialRef,
      metadata: { ...(record.metadata ?? {}), restoredId: record.id },
    });
  };

  let accountsHydrated = false;
  const hydrateAccountsFromStorage = async () => {
    if (accountsHydrated) return;
    await ensureSeeded();
    const rows = await storage.accounts.listAccounts(SEED_IDS.emptyProject);
    for (const row of rows) {
      const refs = await storage.accounts.listCredentialRefs(row.id);
      importAccountSafe({
        id: row.id,
        projectId: row.projectId,
        platform: row.platform,
        accountName: row.displayName,
        authMode: "session",
        credentialRef: refs[0]?.vaultRef,
        createdAt: row.createdAt,
        metadata: { status: row.status },
      });
    }
    accountsHydrated = true;
  };

  const persistConnectedAccount = async (record: {
    id: string;
    projectId?: string;
    platform: string;
    accountName: string;
    credentialRef?: string;
  }) => {
    await ensureSeeded();
    const projectId = record.projectId || SEED_IDS.emptyProject;

    // Resolve SQLite account id (must match platform_account.id for credential FK).
    let accountId = record.id;
    const byId = await storage.accounts.getAccount(record.id);
    if (byId) {
      accountId = byId.id;
    } else {
      const listed = await storage.accounts.listAccounts(projectId);
      const match = listed.find(
        (a) =>
          a.platform === record.platform && a.displayName === record.accountName,
      );
      if (match) {
        accountId = match.id;
      } else {
        const created = await storage.accounts.createAccount({
          id: record.id,
          projectId,
          platform: record.platform,
          displayName: record.accountName,
          externalId: record.accountName,
          status: "connected",
          routerTagsJson: null,
        });
        accountId = created.id;
      }
    }

    // Keep in-memory manager aligned with SQLite primary key.
    if (accountId !== record.id) {
      accountManager.disconnectAccount(record.id);
      importAccountSafe({
        id: accountId,
        projectId,
        platform: record.platform,
        accountName: record.accountName,
        authMode: "session",
        credentialRef: record.credentialRef,
      });
    }

    if (record.credentialRef) {
      const refs = await storage.accounts.listCredentialRefs(accountId);
      if (!refs.some((r) => r.vaultRef === record.credentialRef)) {
        await storage.accounts.putCredentialRef({
          accountId,
          vaultRef: record.credentialRef,
          kind: "session",
        });
      }
    }
  };

  const accountHandlers = createAccountDomainHandlers(accountManager);
  const accountConnectBase = accountHandlers["account.connect"]!;
  const accountListBase = accountHandlers["account.listAccounts"]!;
  const accountMatrixBase = accountHandlers["account.getMatrix"]!;

  accountHandlers["account.listAccounts"] = async (args, ctx) => {
    await hydrateAccountsFromStorage();
    return accountListBase(args, ctx);
  };
  accountHandlers["account.getMatrix"] = async (args, ctx) => {
    await hydrateAccountsFromStorage();
    return accountMatrixBase(args, ctx);
  };

  accountHandlers["account.connect"] = async (args, ctx) => {
    await hydrateAccountsFromStorage();
    const username =
      typeof args.username === "string" && args.username.trim()
        ? args.username.trim()
        : typeof args.accountName === "string" && args.accountName.trim()
          ? args.accountName.trim()
          : "";
    const password =
      typeof args.password === "string" && args.password.length > 0
        ? args.password
        : "";
    let credentialRef =
      typeof args.credentialRef === "string" ? args.credentialRef : undefined;

    const projectId =
      typeof args.projectId === "string" && args.projectId.trim()
        ? args.projectId.trim()
        : SEED_IDS.emptyProject;

    let connected: unknown;
    if (password) {
      if (!username) {
        throw new Error("아이디(또는 이메일)를 입력하세요.");
      }
      const platform =
        typeof args.platform === "string" ? args.platform : "unknown";
      const put = await vault.putSecret({
        kind: "session",
        plaintext: JSON.stringify({
          schema_version: 1,
          username,
          password,
          platform,
        }),
        meta: { platform, accountName: username },
      });
      credentialRef = put.ref;
      const { password: _pw, ...rest } = args;
      void _pw;
      connected = await accountConnectBase(
        {
          ...rest,
          projectId,
          accountName: username,
          username,
          authMode:
            typeof args.authMode === "string" ? args.authMode : "session",
          credentialRef,
        },
        ctx,
      );
    } else {
      connected = await accountConnectBase(
        {
          ...args,
          projectId,
          accountName: username || args.accountName,
          credentialRef,
        },
        ctx,
      );
    }

    const row = connected as {
      id?: string;
      platform?: string;
      accountName?: string;
      credentialRef?: string;
      projectId?: string;
    };
    if (row?.id && row.platform && row.accountName) {
      try {
        await persistConnectedAccount({
          id: row.id,
          projectId: row.projectId || projectId,
          platform: row.platform,
          accountName: row.accountName,
          credentialRef: row.credentialRef ?? credentialRef,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(
          `계정 저장에 실패했습니다. 같은 아이디로 다시 연결해 보세요. (${msg})`,
        );
      }
      const saved = accountManager
        .listAccounts(projectId)
        .find(
          (a) =>
            a.platform === row.platform && a.accountName === row.accountName,
        );
      if (saved) return saved;
    }
    return connected;
  };

  const host = createDomainHost({
    observability,
    handlers: {
      ...accountHandlers,
      ...publishHandlers,
      ...createNotificationDomainHandlers(runtime.notificationManager),
      ...createWorkflowDomainHandlers(workflowEngine),
      ...createContentDomainHandlers(contentEngine, {
        generateJobId,
        defaultExportRoot: process.cwd(),
      }),
      ...createResearchDomainHandlers(researchEngine, {
        generateJobId,
        defaultProjectId: SEED_IDS.emptyProject,
      }),
      ...createPlanningDomainHandlers(topicGenerator, {
        defaultProjectId: SEED_IDS.emptyProject,
      }),
      "analytics.listExperiments": withSeed(
        analyticsHandlers["analytics.listExperiments"]!,
      ),
      "analytics.createExperiment": withSeed(
        analyticsHandlers["analytics.createExperiment"]!,
      ),
      "memory.listEpisodes": withSeed(memoryHandlers["memory.listEpisodes"]!),
      "memory.getEpisode": withSeed(memoryHandlers["memory.getEpisode"]!),
      "memory.search": withSeed(memoryHandlers["memory.search"]!),
      "memory.recordEpisode": withSeed(memoryHandlers["memory.recordEpisode"]!),
      "learning.listPolicies": withSeed(learningHandlers["learning.listPolicies"]!),
      "learning.getPolicy": withSeed(learningHandlers["learning.getPolicy"]!),
      "learning.acceptProposal": withSeed(
        learningHandlers["learning.acceptProposal"]!,
      ),
      "learning.rejectProposal": withSeed(
        learningHandlers["learning.rejectProposal"]!,
      ),
      "learning.getConfidence": withSeed(
        learningHandlers["learning.getConfidence"]!,
      ),
      "learning.listReflections": withSeed(
        learningHandlers["learning.listReflections"]!,
      ),
      "learning.proposeFromRoi": withSeed(
        learningHandlers["learning.proposeFromRoi"]!,
      ),
      "learning.runReflection": withSeed(
        learningHandlers["learning.runReflection"]!,
      ),
      "executive.getGoals": withSeed(executiveHandlers["executive.getGoals"]!),
      "executive.setGoal": withSeed(executiveHandlers["executive.setGoal"]!),
      "executive.getHorizon": withSeed(executiveHandlers["executive.getHorizon"]!),
      "executive.explainDecision": withSeed(
        executiveHandlers["executive.explainDecision"]!,
      ),
      "executive.getReallocations": withSeed(
        executiveHandlers["executive.getReallocations"]!,
      ),
      "executive.linkMission": withSeed(
        executiveHandlers["executive.linkMission"]!,
      ),
      "executive.getGoalChain": withSeed(
        executiveHandlers["executive.getGoalChain"]!,
      ),
      "settings.getGlobal": withSeed(settingsHandlers["settings.getGlobal"]!),
      "settings.setGlobal": withSeed(settingsHandlers["settings.setGlobal"]!),
      "settings.getProject": withSeed(settingsHandlers["settings.getProject"]!),
      "settings.setProject": withSeed(settingsHandlers["settings.setProject"]!),
      "settings.getUser": withSeed(settingsHandlers["settings.getUser"]!),
      "settings.setUser": withSeed(settingsHandlers["settings.setUser"]!),
      "knowledge.list": withSeed(knowledgeHandlers["knowledge.list"]!),
      "knowledge.get": withSeed(knowledgeHandlers["knowledge.get"]!),
      "knowledge.search": withSeed(knowledgeHandlers["knowledge.search"]!),
      "knowledge.put": withSeed(knowledgeHandlers["knowledge.put"]!),
      "knowledge.delete": withSeed(knowledgeHandlers["knowledge.delete"]!),
      "tool.listProfiles": withSeed(toolHandlers["tool.listProfiles"]!),
      "tool.pickFile": withSeed(toolHandlers["tool.pickFile"]!),
      "tool.pickDirectory": withSeed(toolHandlers["tool.pickDirectory"]!),
      "tool.runOcr": withSeed(toolHandlers["tool.runOcr"]!),
      "growth.estimateRevenue": withSeed(revenueHandlers["growth.estimateRevenue"]!),
      "growth.prioritizeRevenue": withSeed(
        revenueHandlers["growth.prioritizeRevenue"]!,
      ),
      "growth.runDailyDecision": withSeed(
        decisionHandlers["growth.runDailyDecision"]!,
      ),
      "growth.getMissionToday": withSeed(
        decisionHandlers["growth.getMissionToday"]!,
      ),
      "growth.getDecision": withSeed(decisionHandlers["growth.getDecision"]!),
      "growth.explainDecision": withSeed(
        decisionHandlers["growth.explainDecision"]!,
      ),
      "growth.listPlannerQueue": withSeed(
        decisionHandlers["growth.listPlannerQueue"]!,
      ),
      ...automationHandlers,
      // Ensure seed + AsyncJobAck shape for Mission Center (Queue path unchanged).
      "automation.startMission": async (args, ctx) => {
        await ensureSeeded();
        const result = await automationHandlers["automation.startMission"]!(
          args,
          ctx,
        );
        const data = result as {
          jobId: string;
          traceId: string;
          plannerQueueItemId?: string;
        };
        return createAsyncJobAck(data.jobId, data.traceId, {
          plannerQueueItemId: data.plannerQueueItemId,
        });
      },
    },
  });

  registerDomainIpcHandlers(ipcMain, host);

  return {
    host,
    observability,
    accountManager,
    notificationManager: runtime.notificationManager,
    accountEventBus: runtime.accountEventBus,
    automation,
    storage,
    researchEngine,
    contentEngine,
    stopForwarder: () => {
      runtime.stop();
      automation.stop();
    },
    attachPushTarget: (send) => {
      pushSend = send;
    },
    close: async () => {
      closed = true;
      if (seedReady) {
        await seedReady.catch(() => undefined);
      }
      automation.stop();
      runtime.stop();
      try {
        storage.close();
      } catch {
        /* already closed */
      }
    },
  };
}
