import { describe, expect, it } from "vitest";
import { buildDomainChannel } from "./channel.js";
import { NAMESPACE_METHOD_METADATA } from "../namespaces/types.js";

describe("Domain API channel registry", () => {
  it("defines all §5 namespace methods with domain: channel prefix", () => {
    const channels: string[] = [];

    for (const [namespace, methods] of Object.entries(NAMESPACE_METHOD_METADATA)) {
      for (const methodName of Object.keys(methods)) {
        channels.push(buildDomainChannel(namespace, methodName));
      }
    }

    expect(channels.length).toBeGreaterThan(80);
    expect(new Set(channels).size).toBe(channels.length);
    expect(channels.every((channel) => channel.startsWith("domain:"))).toBe(true);
    expect(channels).toContain("domain:automation.startMission");
    expect(channels).toContain("domain:governance.activateKillSwitch");
  });
});
