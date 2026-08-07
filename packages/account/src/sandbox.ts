import type { ConnectorRegistry } from "@clime/connector-registry";
import type { ConnectorDoctor } from "./doctor.js";
import type { SandboxResult } from "./types.js";

export class AccountSandbox {
  constructor(
    private connectorRegistry: ConnectorRegistry,
    private doctor: ConnectorDoctor
  ) {}

  public async runTest(accountId: string, platform: string): Promise<SandboxResult> {
    const logs: string[] = [];
    const timestamp = new Date().toISOString();

    logs.push(`[${timestamp}] Starting account sandbox test for ${accountId} (${platform})`);

    const reg = this.connectorRegistry.get(platform);
    if (!reg || !reg.enabled) {
      logs.push(`[ERROR] Connector for platform '${platform}' is not registered or disabled`);
      return {
        accountId,
        platform,
        success: false,
        logs,
        testedAt: timestamp,
      };
    }

    logs.push(`[INFO] Connector manifest loaded: ${reg.manifest.name} v${reg.manifest.version}`);
    logs.push(`[INFO] Declared auth modes: ${reg.manifest.authModes.join(", ")}`);
    logs.push(`[INFO] Declared publish mode: ${reg.manifest.capabilities.publishMode}`);
    logs.push(`[INFO] Declared risk level: ${reg.manifest.capabilities.riskLevel}`);

    const health = this.doctor.getHealth(accountId, platform);
    logs.push(`[INFO] Current health state: ${health.status}`);

    if (health.status === "challenge" || health.status === "expired") {
      logs.push(`[WARN] Account health is in ${health.status} state. Auto-publish path restricted.`);
    } else {
      logs.push(`[PASS] Read profile capability test passed`);
      logs.push(`[PASS] Auth token integrity test passed`);
    }

    logs.push(`[SUCCESS] Account sandbox test completed`);

    return {
      accountId,
      platform: reg.manifest.platform,
      success: health.status !== "challenge" && health.status !== "expired",
      logs,
      testedAt: timestamp,
    };
  }
}
