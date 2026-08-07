import {
  type ConnectorRegistry,
  createConnectorRegistry,
} from "@clime/connector-registry";
import { CapabilityMatrixService, HONEST_MATRIX_NOTICE } from "./matrix.js";
import { AccountRouter, type ConnectedAccountRecord } from "./router.js";
import { ConnectorDoctor } from "./doctor.js";
import { AccountSandbox } from "./sandbox.js";
import type {
  ConnectAccountInput,
  PlatformCapabilityMatrix,
  AccountRouteInput,
  AccountRouteResult,
  AccountHealthState,
  SandboxResult,
  DoctorDiagnosis,
} from "./types.js";

export interface EventBusLike {
  emit(event: string, payload: Record<string, unknown>): void;
}

export class AccountManager {
  public readonly registry: ConnectorRegistry;
  public readonly matrixService: CapabilityMatrixService;
  public readonly router: AccountRouter;
  public readonly doctor: ConnectorDoctor;
  public readonly sandbox: AccountSandbox;

  private connectedAccounts = new Map<string, ConnectedAccountRecord & {
    authMode: string;
    credentialRef?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
  }>();

  private wizardProgress = {
    step: "platform_select",
    completed: false,
    updatedAt: new Date().toISOString(),
  };

  private eventBus?: EventBusLike;

  constructor(options?: {
    registry?: ConnectorRegistry;
    eventBus?: EventBusLike;
  }) {
    this.registry = options?.registry || createConnectorRegistry();
    this.matrixService = new CapabilityMatrixService(this.registry);
    this.router = new AccountRouter(this.matrixService);
    this.doctor = new ConnectorDoctor();
    this.sandbox = new AccountSandbox(this.registry, this.doctor);
    this.eventBus = options?.eventBus;
  }

  /** Wire System/Notification bus after construct (desktop bootstrap). */
  public setEventBus(eventBus: EventBusLike | undefined): void {
    this.eventBus = eventBus;
  }

  public listAccounts(projectId = "default-project") {
    return Array.from(this.connectedAccounts.values()).filter(
      (a) => a.projectId === projectId || projectId === "all"
    );
  }

  /** Restore a previously persisted account (SQLite hydrate). No bus events. */
  public importConnectedAccount(record: {
    id: string;
    projectId: string;
    platform: string;
    accountName: string;
    authMode: string;
    credentialRef?: string;
    metadata?: Record<string, unknown>;
    isPrimary?: boolean;
    createdAt?: string;
  }) {
    this.connectedAccounts.set(record.id, {
      id: record.id,
      projectId: record.projectId,
      platform: record.platform,
      accountName: record.accountName,
      authMode: record.authMode,
      credentialRef: record.credentialRef,
      metadata: record.metadata,
      isPrimary: record.isPrimary !== false,
      createdAt: record.createdAt ?? new Date().toISOString(),
    });
  }

  public connectAccount(input: ConnectAccountInput, eventBus?: EventBusLike) {
    const bus = eventBus ?? this.eventBus;
    const id = `acc_${input.platform}__${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const record = {
      id,
      projectId: input.projectId,
      platform: input.platform,
      accountName: input.accountName,
      authMode: input.authMode,
      credentialRef: input.credentialRef,
      metadata: input.metadata,
      isPrimary: input.metadata?.isPrimary !== false,
      createdAt: new Date().toISOString(),
    };

    this.connectedAccounts.set(id, record);

    bus?.emit("AccountConnected", {
      accountId: id,
      platform: input.platform,
      authMode: input.authMode,
      traceId: `tr_acc_${id}`,
    });

    const matrix = this.matrixService.computeMatrix(id, input.platform);
    bus?.emit("CapabilityChanged", {
      accountId: id,
      capability: matrix,
      traceId: `tr_acc_${id}`,
    });

    return record;
  }

  public disconnectAccount(accountId: string) {
    const deleted = this.connectedAccounts.delete(accountId);
    return { success: deleted, accountId };
  }

  public getCapabilityMatrix(accountId?: string, platform?: string): PlatformCapabilityMatrix {
    // B1-A §7: no accountId → primary/first connected, or honest "no account" Matrix.
    if (!accountId) {
      const connected = Array.from(this.connectedAccounts.values());
      if (connected.length === 0) {
        return {
          schema_version: 1,
          accountId: "none",
          platform: platform || "none",
          canPublish: false,
          publishMode: "api",
          riskLevel: "high",
          readProfile: false,
          importUrl: false,
          schedule: false,
          reelsOrShorts: false,
          stories: false,
          notice: `${HONEST_MATRIX_NOTICE} (연결된 계정 없음)`,
          updatedAt: new Date().toISOString(),
        };
      }
      const primary =
        connected.find((a) => a.isPrimary !== false && (!platform || a.platform === platform)) ??
        connected.find((a) => !platform || a.platform === platform) ??
        connected[0]!;
      return this.getCapabilityMatrix(primary.id, platform || primary.platform);
    }

    const account = this.connectedAccounts.get(accountId);
    const plat = platform || account?.platform || "naver";
    const health = this.doctor.getHealth(accountId, plat);
    return this.matrixService.computeMatrix(accountId, plat, health);
  }

  public route(input: AccountRouteInput): AccountRouteResult {
    const accounts = Array.from(this.connectedAccounts.values());
    return this.router.route(input, accounts);
  }

  public checkHealth(accountId: string, platform?: string): AccountHealthState {
    const account = this.connectedAccounts.get(accountId);
    const plat = platform || account?.platform || "naver";
    return this.doctor.getHealth(accountId, plat);
  }

  public setHealthState(state: AccountHealthState, eventBus?: EventBusLike): AccountHealthState {
    const bus = eventBus ?? this.eventBus;
    const updated = this.doctor.setHealth(state);

    if (state.status === "degraded") {
      bus?.emit("ConnectorDegraded", {
        accountId: state.accountId,
        platform: state.platform,
        reason: state.reason || "Performance degraded",
        traceId: `tr_health_${state.accountId}`,
      });
    } else if (state.status === "challenge") {
      const challengeTraceId = state.traceId ?? `tr_challenge_${state.accountId}`;
      bus?.emit("PublishChallengeDetected", {
        accountId: state.accountId,
        platform: state.platform,
        challengeType: "captcha_or_lock",
        reason: state.reason || "Security challenge detected - pipeline paused",
        traceId: challengeTraceId,
      });
      bus?.emit("PublishAutoPaused", {
        accountId: state.accountId,
        platform: state.platform,
        reason: "Security challenge detected - pipeline paused",
        traceId: challengeTraceId,
      });
    }

    return updated;
  }

  public diagnoseError(errorCodeOrMessage: string): DoctorDiagnosis {
    return this.doctor.diagnoseError(errorCodeOrMessage);
  }

  public async runSandbox(accountId: string, platform?: string): Promise<SandboxResult> {
    const account = this.connectedAccounts.get(accountId);
    const plat = platform || account?.platform || "naver";
    return this.sandbox.runTest(accountId, plat);
  }

  public getWizardProgress() {
    return this.wizardProgress;
  }

  public updateWizardProgress(step: string, completed = false) {
    this.wizardProgress = {
      step,
      completed,
      updatedAt: new Date().toISOString(),
    };
    return this.wizardProgress;
  }
}

export function createAccountManager(options?: {
  registry?: ConnectorRegistry;
  eventBus?: EventBusLike;
}): AccountManager {
  return new AccountManager(options);
}
