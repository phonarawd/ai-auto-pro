import { describe, expect, it } from "vitest";
import { validateConnectorManifest } from "./manifest.js";

describe("plugin-sdk", () => {
  it("validates a valid connector manifest", () => {
    const raw = {
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
      runtimeHints: {
        requiresBAE: true,
      },
    };

    const manifest = validateConnectorManifest(raw);
    expect(manifest.id).toBe("naver-blog");
    expect(manifest.capabilities.publishMode).toBe("session");
  });

  it("fails on invalid manifest schema", () => {
    const raw = {
      id: "invalid-manifest",
    };
    expect(() => validateConnectorManifest(raw)).toThrow();
  });
});
