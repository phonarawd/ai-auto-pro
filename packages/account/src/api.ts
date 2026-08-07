import type { AccountManager } from "./manager.js";

type ArgRecord = Record<string, unknown>;

type DomainHandler = (
  args: ArgRecord,
  context: {
    requestId: string;
    traceId: string;
    projectId?: string | null;
  },
) => Promise<unknown>;

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function listPlatformBadges(manager: AccountManager) {
  return manager.registry
    .list()
    .filter((r) => r.enabled)
    .map((r) => ({
      id: r.manifest.platform,
      name: r.manifest.name,
      canPublish: r.manifest.capabilities.canPublish,
      publishMode: r.manifest.capabilities.publishMode,
      riskLevel: r.manifest.capabilities.riskLevel,
    }));
}

/**
 * Typed AccountAPI handlers used by unit tests and thin wrappers.
 */
export function createAccountApiHandlers(manager: AccountManager) {
  return {
    "account.listAccounts": async (args?: { projectId?: string }) => {
      const projectId = args?.projectId || "seed_project_empty";
      return manager.listAccounts(projectId);
    },

    "account.connect": async (args: {
      projectId: string;
      platform: string;
      accountName: string;
      authMode: "oauth" | "session" | "manual";
      credentialRef?: string;
      metadata?: Record<string, unknown>;
    }) => {
      return manager.connectAccount(args);
    },

    "account.disconnect": async (args: { accountId: string }) => {
      return manager.disconnectAccount(args.accountId);
    },

    "account.getMatrix": async (args?: { accountId?: string; platform?: string }) => {
      const matrix = manager.getCapabilityMatrix(args?.accountId, args?.platform);
      return {
        ...matrix,
        platforms: listPlatformBadges(manager),
      };
    },

    "account.route": async (args: {
      projectId?: string;
      channel?: string;
      campaignTag?: string;
      action?: string;
    }) => {
      return manager.route(args);
    },

    "account.health": async (args: { accountId: string; platform?: string }) => {
      return manager.checkHealth(args.accountId, args.platform);
    },

    "account.sandboxTest": async (args: { accountId: string; platform?: string }) => {
      return manager.runSandbox(args.accountId, args.platform);
    },

    "account.importUrl": async (args: { url: string; platform?: string }) => {
      return {
        schema_version: 1,
        url: args.url,
        platform: args.platform || "naver",
        importedFields: ["title", "nickname", "profileImage", "recentPostsCount"],
        unsupportedFields: ["privateSettings"],
        notice: "Best-effort public profile import complete",
      };
    },

    "account.wizardProgress": async (args?: { step?: string; completed?: boolean }) => {
      if (args?.step) {
        return manager.updateWizardProgress(args.step, args.completed ?? false);
      }
      return manager.getWizardProgress();
    },

    "account.pausePublish": async (args: { accountId: string; reason?: string }) => {
      const account = manager.listAccounts("all").find((a) => a.id === args.accountId);
      const state = manager.setHealthState({
        accountId: args.accountId,
        platform: account?.platform || "unknown",
        status: "challenge",
        reason: args.reason || "Manually paused auto-publishing",
        checkedAt: new Date().toISOString(),
      });
      return { paused: true, healthState: state };
    },

    "account.resumePublish": async (args: { accountId: string }) => {
      const account = manager.listAccounts("all").find((a) => a.id === args.accountId);
      const state = manager.setHealthState({
        accountId: args.accountId,
        platform: account?.platform || "unknown",
        status: "healthy",
        reason: "User verified and resumed publishing",
        checkedAt: new Date().toISOString(),
      });
      return { resumed: true, healthState: state };
    },
  };
}

/**
 * Domain host handler map (`domain:account.*`) — B1-A wiring into createDomainHost({ handlers }).
 * Core never imports plugins/*; handlers call AccountManager + Manifest registry only.
 */
export function createAccountDomainHandlers(manager: AccountManager): Record<string, DomainHandler> {
  const api = createAccountApiHandlers(manager);

  return {
    "account.listAccounts": async (args, ctx) =>
      api["account.listAccounts"]({
        projectId: asString(args.projectId, ctx.projectId || "seed_project_empty"),
      }),

    "account.connect": async (args) =>
      api["account.connect"]({
        projectId: asString(args.projectId, "seed_project_empty"),
        platform: asString(args.platform),
        accountName:
          asString(args.accountName) || asString(args.username) || asString(args.platform),
        authMode: asString(args.authMode, "session") as "oauth" | "session" | "manual",
        credentialRef: asOptionalString(args.credentialRef),
        metadata:
          args.metadata && typeof args.metadata === "object"
            ? (args.metadata as Record<string, unknown>)
            : undefined,
      }),

    "account.disconnect": async (args) =>
      api["account.disconnect"]({ accountId: asString(args.accountId) }),

    "account.getMatrix": async (args) =>
      api["account.getMatrix"]({
        accountId: asOptionalString(args.accountId),
        platform: asOptionalString(args.platform),
      }),

    "account.route": async (args) =>
      api["account.route"]({
        projectId: asOptionalString(args.projectId),
        channel: asOptionalString(args.channel),
        campaignTag: asOptionalString(args.campaignTag),
        action: asOptionalString(args.action),
      }),

    "account.health": async (args) =>
      api["account.health"]({
        accountId: asString(args.accountId),
        platform: asOptionalString(args.platform),
      }),

    "account.sandboxTest": async (args) =>
      api["account.sandboxTest"]({
        accountId: asString(args.accountId),
        platform: asOptionalString(args.platform),
      }),

    "account.importUrl": async (args) =>
      api["account.importUrl"]({
        url: asString(args.url),
        platform: asOptionalString(args.platform),
      }),

    "account.wizardProgress": async (args) =>
      api["account.wizardProgress"]({
        step: asOptionalString(args.step),
        completed: typeof args.completed === "boolean" ? args.completed : undefined,
      }),

    "account.pausePublish": async (args) =>
      api["account.pausePublish"]({
        accountId: asString(args.accountId),
        reason: asOptionalString(args.reason),
      }),

    "account.resumePublish": async (args) =>
      api["account.resumePublish"]({ accountId: asString(args.accountId) }),
  };
}
