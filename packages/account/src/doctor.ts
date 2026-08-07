import type { AccountHealthState, DoctorDiagnosis } from "./types.js";

export class ConnectorDoctor {
  private healthStore = new Map<string, AccountHealthState>();

  public setHealth(state: AccountHealthState): AccountHealthState {
    this.healthStore.set(state.accountId, state);
    return state;
  }

  public getHealth(accountId: string, platform = "unknown"): AccountHealthState {
    return (
      this.healthStore.get(accountId) || {
        accountId,
        platform,
        status: "healthy",
        checkedAt: new Date().toISOString(),
      }
    ) as AccountHealthState;
  }

  public diagnoseError(errorCodeOrMessage: string): DoctorDiagnosis {
    const text = errorCodeOrMessage.toLowerCase();

    if (text.includes("captcha") || text.includes("challenge") || text.includes("2fa") || text.includes("lock")) {
      return {
        errorCode: "CHALLENGE_REQUIRED",
        summary: "플랫폼 보안 검증(캡차/2FA/인증)이 요청되었습니다.",
        remediationStep: "내 계정 관리/인박스에서 직접 로그인 검증을 완료하고 게시를 재개하세요.",
        autoPauseTriggered: true,
      };
    }

    if (text.includes("token") || text.includes("expired") || text.includes("401") || text.includes("unauthorized")) {
      return {
        errorCode: "SESSION_EXPIRED",
        summary: "플랫폼 인증 토큰 또는 브라우저 세션이 만료되었습니다.",
        remediationStep: "계정 관리 페이지에서 [다시 연결] 버튼을 눌러 인증을 갱신하세요.",
        autoPauseTriggered: true,
      };
    }

    if (text.includes("rate limit") || text.includes("429") || text.includes("quota")) {
      return {
        errorCode: "RATE_LIMITED",
        summary: "플랫폼 요청 빈도 제한(Rate Limit)에 도달했습니다.",
        remediationStep: "잠시 후 게시가 자동 재시도됩니다. 일일 게시 한도를 확인하세요.",
        autoPauseTriggered: false,
      };
    }

    return {
      errorCode: "UNKNOWN_CONNECTOR_ERROR",
      summary: `연결 처리 중 오차가 발생했습니다: ${errorCodeOrMessage}`,
      remediationStep: "계정 상태 및 네트워크 연결을 확인한 후 다시 시도하세요.",
      autoPauseTriggered: false,
    };
  }
}
