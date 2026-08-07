import type { ConnectorRegistry } from "@clime/connector-registry";
import type { PlatformCapabilityMatrix, AccountHealthState } from "./types.js";

export const HONEST_MATRIX_NOTICE = "이 플랫폼은 여기까지 가능합니다.";

export class CapabilityMatrixService {
  constructor(private connectorRegistry: ConnectorRegistry) {}

  public computeMatrix(
    accountId: string,
    platform: string,
    healthState?: AccountHealthState
  ): PlatformCapabilityMatrix {
    const reg = this.connectorRegistry.get(platform);
    if (!reg || !reg.enabled) {
      return {
        schema_version: 1,
        accountId,
        platform,
        canPublish: false,
        publishMode: "api",
        riskLevel: "high",
        readProfile: false,
        importUrl: false,
        schedule: false,
        reelsOrShorts: false,
        stories: false,
        notice: `${HONEST_MATRIX_NOTICE} (커넥터 미등록 또는 비활성화됨)`,
        updatedAt: new Date().toISOString(),
      };
    }

    const caps = reg.manifest.capabilities;
    const isPaused = healthState?.status === "challenge" || healthState?.status === "expired";
    const canPublish = caps.canPublish && !isPaused;

    let notice = HONEST_MATRIX_NOTICE;
    if (healthState?.status === "challenge") {
      notice = `${HONEST_MATRIX_NOTICE} (보안 챌린지 감지되어 자동 일시정지됨)`;
    } else if (healthState?.status === "expired") {
      notice = `${HONEST_MATRIX_NOTICE} (인증 세션이 만료됨)`;
    } else if (caps.publishMode === "session") {
      notice = `${HONEST_MATRIX_NOTICE} (BAE 브라우저 세션 게시 연결)`;
    }

    const hasReelsOrShorts =
      caps.supportedMedia.includes("reels") || caps.supportedMedia.includes("shorts");

    return {
      schema_version: 1,
      accountId,
      platform: reg.manifest.platform,
      canPublish,
      publishMode: caps.publishMode,
      riskLevel: caps.riskLevel,
      readProfile: caps.canReadProfile,
      importUrl: caps.canImportUrl,
      schedule: caps.canSchedule,
      reelsOrShorts: hasReelsOrShorts,
      // V1 Manifest media enum has no dedicated "stories" — stay honest (false).
      stories: false,
      notice,
      updatedAt: new Date().toISOString(),
    };
  }
}
