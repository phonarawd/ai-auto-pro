import type { ConnectorManifest } from "./manifest.js";

export interface ConnectorHealthStatus {
  status: "healthy" | "degraded" | "expired" | "challenge";
  reason?: string;
  checkedAt: string;
}

export interface SandboxTestResult {
  success: boolean;
  logs: string[];
  testedAt: string;
}

export interface IPlatformConnector {
  readonly manifest: ConnectorManifest;
  healthCheck(accountId: string): Promise<ConnectorHealthStatus>;
  sandboxTest(accountId: string): Promise<SandboxTestResult>;
}
