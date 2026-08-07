import { describe, expect, it } from "vitest";
import { ConnectorRegistry } from "./registry.js";

describe("connector-registry", () => {
  it("registers default connectors with honest capabilities", () => {
    const registry = new ConnectorRegistry();
    const list = registry.list();
    expect(list.length).toBeGreaterThanOrEqual(6);

    const naver = registry.get("naver");
    expect(naver).not.toBeNull();
    expect(naver?.manifest.capabilities.publishMode).toBe("session");

    const ig = registry.get("instagram");
    expect(ig).not.toBeNull();
    expect(ig?.manifest.capabilities.publishMode).toBe("api");
  });

  it("registers new manifest dynamically", () => {
    const registry = new ConnectorRegistry();
    const newManifest = {
      schema_version: 1,
      id: "tiktok-business",
      version: "1.0.0",
      name: "TikTok Business Connector",
      platform: "tiktok",
      authModes: ["oauth"],
      capabilities: {
        canReadProfile: true,
        canImportUrl: false,
        canSchedule: true,
        canPublish: true,
        publishMode: "api",
        riskLevel: "medium",
        supportedMedia: ["video"],
      },
    };

    const reg = registry.register(newManifest);
    expect(reg.id).toBe("tiktok-business");
    expect(registry.get("tiktok")?.manifest.name).toBe("TikTok Business Connector");
  });

  it("supports enabling and disabling connectors", () => {
    const registry = new ConnectorRegistry();
    expect(registry.get("naver")?.enabled).toBe(true);
    registry.setEnabled("naver-blog", false);
    expect(registry.get("naver")?.enabled).toBe(false);
  });
});
