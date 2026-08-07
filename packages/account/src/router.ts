import type { AccountRouteInput, AccountRouteResult } from "./types.js";
import type { CapabilityMatrixService } from "./matrix.js";

export interface ConnectedAccountRecord {
  id: string;
  projectId: string;
  platform: string;
  accountName: string;
  isPrimary?: boolean;
}

export class AccountRouter {
  constructor(private matrixService: CapabilityMatrixService) {}

  public route(
    input: AccountRouteInput,
    accounts: ConnectedAccountRecord[]
  ): AccountRouteResult {
    const channel = (input.channel || "default").toLowerCase();
    const tag = input.campaignTag?.trim() || "";

    const filtered = accounts.filter(
      (a) => !input.projectId || a.projectId === input.projectId
    );

    let matching = filtered.filter(
      (a) => a.platform.toLowerCase() === channel || channel === "default"
    );

    if (matching.length === 0) {
      matching = filtered;
    }

    let target: ConnectedAccountRecord | undefined;

    if (tag === "이벤트") {
      target = matching.find((a) => !a.isPrimary) || matching[0];
    } else if (tag === "브랜드") {
      target = matching.find((a) => a.isPrimary) || matching[0];
    } else {
      target = matching.find((a) => a.isPrimary) || matching[0];
    }

    const fallbackId = target?.id || "default-account";
    const targetPlatform = target?.platform || (channel !== "default" ? channel : "naver");

    const matrix = this.matrixService.computeMatrix(fallbackId, targetPlatform);

    return {
      schema_version: 1,
      targetAccount: fallbackId,
      platform: targetPlatform,
      publishMode: matrix.publishMode,
      riskLevel: matrix.riskLevel,
      reason: target
        ? `Routed account '${target.accountName}' for channel '${targetPlatform}' (tag: '${tag || "none"}')`
        : `Default fallback account routed for channel '${channel}'`,
    };
  }
}
