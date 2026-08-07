import {
  type ConnectorManifest,
  validateConnectorManifest,
} from "@clime/plugin-sdk";

export interface ConnectorRegistration {
  id: string;
  manifest: ConnectorManifest;
  enabled: boolean;
  registeredAt: string;
}

export class ConnectorRegistry {
  private registrations = new Map<string, ConnectorRegistration>();

  constructor() {
    this.registerDefaults();
  }

  public register(manifestInput: unknown, enabled = true): ConnectorRegistration {
    const manifest = validateConnectorManifest(manifestInput);
    const existing = this.registrations.get(manifest.id);
    const registration: ConnectorRegistration = {
      id: manifest.id,
      manifest,
      enabled: existing ? existing.enabled : enabled,
      registeredAt: existing ? existing.registeredAt : new Date().toISOString(),
    };
    this.registrations.set(manifest.id, registration);
    return registration;
  }

  public get(idOrPlatform: string): ConnectorRegistration | null {
    if (this.registrations.has(idOrPlatform)) {
      return this.registrations.get(idOrPlatform)!;
    }
    for (const reg of this.registrations.values()) {
      if (reg.manifest.platform.toLowerCase() === idOrPlatform.toLowerCase()) {
        return reg;
      }
    }
    return null;
  }

  public list(): ConnectorRegistration[] {
    return Array.from(this.registrations.values());
  }

  public setEnabled(id: string, enabled: boolean): boolean {
    const reg = this.registrations.get(id);
    if (!reg) return false;
    reg.enabled = enabled;
    return true;
  }

  private registerDefaults(): void {
    const defaultManifests: ConnectorManifest[] = [
      {
        schema_version: 1,
        id: "naver-blog",
        version: "1.0.0",
        name: "Naver Blog Connector",
        platform: "naver",
        authModes: ["session", "manual"],
        capabilities: {
          canReadProfile: true,
          canImportUrl: true,
          canSchedule: true,
          canPublish: true,
          publishMode: "session",
          riskLevel: "medium",
          supportedMedia: ["text", "image"],
        },
        runtimeHints: { requiresBAE: true, rateLimitPerMinute: 10 },
      },
      {
        schema_version: 1,
        id: "instagram-business",
        version: "1.0.0",
        name: "Instagram Business Connector",
        platform: "instagram",
        authModes: ["oauth", "session"],
        capabilities: {
          canReadProfile: true,
          canImportUrl: true,
          canSchedule: true,
          canPublish: true,
          publishMode: "api",
          riskLevel: "low",
          supportedMedia: ["image", "video", "reels", "carousel"],
        },
        runtimeHints: { rateLimitPerMinute: 30 },
      },
      {
        schema_version: 1,
        id: "x-twitter",
        version: "1.0.0",
        name: "X (Twitter) Connector",
        platform: "x",
        authModes: ["oauth", "session"],
        capabilities: {
          canReadProfile: true,
          canImportUrl: true,
          canSchedule: true,
          canPublish: true,
          publishMode: "api",
          riskLevel: "low",
          supportedMedia: ["text", "image", "video"],
        },
      },
      {
        schema_version: 1,
        id: "threads",
        version: "1.0.0",
        name: "Threads Connector",
        platform: "threads",
        authModes: ["oauth", "session"],
        capabilities: {
          canReadProfile: true,
          canImportUrl: true,
          canSchedule: true,
          canPublish: true,
          publishMode: "api",
          riskLevel: "low",
          supportedMedia: ["text", "image", "video"],
        },
      },
      {
        schema_version: 1,
        id: "youtube",
        version: "1.0.0",
        name: "YouTube Connector",
        platform: "youtube",
        authModes: ["oauth"],
        capabilities: {
          canReadProfile: true,
          canImportUrl: true,
          canSchedule: true,
          canPublish: true,
          publishMode: "api",
          riskLevel: "low",
          supportedMedia: ["video", "shorts"],
        },
      },
      {
        schema_version: 1,
        id: "facebook",
        version: "1.0.0",
        name: "Facebook Connector",
        platform: "facebook",
        authModes: ["oauth"],
        capabilities: {
          canReadProfile: true,
          canImportUrl: true,
          canSchedule: true,
          canPublish: true,
          publishMode: "api",
          riskLevel: "low",
          supportedMedia: ["text", "image", "video"],
        },
      },
    ];

    for (const manifest of defaultManifests) {
      this.register(manifest, true);
    }
  }
}

export function createConnectorRegistry(): ConnectorRegistry {
  return new ConnectorRegistry();
}
