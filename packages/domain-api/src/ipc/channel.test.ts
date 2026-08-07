import { describe, expect, it } from "vitest";
import { buildDomainChannel, parseDomainChannel } from "./channel.js";

describe("IPC Channel utilities", () => {
  it("builds domain channel string with domain: prefix and lowercase namespace", () => {
    expect(buildDomainChannel("Growth", "getMissionToday")).toBe("domain:growth.getMissionToday");
    expect(buildDomainChannel("AUTOMATION", "startMission")).toBe("domain:automation.startMission");
    expect(buildDomainChannel("governance", "activateKillSwitch")).toBe("domain:governance.activateKillSwitch");
  });

  it("parses valid domain channels", () => {
    expect(parseDomainChannel("domain:growth.getMissionToday")).toEqual({
      namespace: "growth",
      method: "getMissionToday",
    });
    expect(parseDomainChannel("domain:account.getMatrix")).toEqual({
      namespace: "account",
      method: "getMatrix",
    });
  });

  it("returns null for malformed channels", () => {
    expect(parseDomainChannel("invalid:channel")).toBeNull();
    expect(parseDomainChannel("domain:")).toBeNull();
    expect(parseDomainChannel("domain:growth")).toBeNull();
    expect(parseDomainChannel("domain:.getMissionToday")).toBeNull();
  });

  it("rejects forbidden domain. dot-prefix (channel notation must be domain:)", () => {
    expect(parseDomainChannel("domain.growth.getMissionToday")).toBeNull();
    expect(parseDomainChannel("domain.automation.startMission")).toBeNull();
  });
});

