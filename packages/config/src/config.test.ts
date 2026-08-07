import { createAndSeedSqliteStorage } from "@clime/storage";
import { afterEach, describe, expect, it } from "vitest";
import {
  ConfigForbiddenKeyError,
  ConfigSecretRejectedError,
  configRef,
  configValue,
  createConfigStore,
  isGovernanceReservedKey,
} from "./index.js";

const closers: Array<() => void> = [];

afterEach(() => {
  while (closers.length) closers.pop()?.();
});

async function openConfig() {
  const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
  closers.push(() => storage.close());
  const project = await storage.projects.create({ name: "cfg-test" });
  const config = createConfigStore({ settings: storage.settings });
  return { config, projectId: project.id, storage };
}

describe("@clime/config cascade", () => {
  it("resolves User > Project > Global", async () => {
    const { config, projectId } = await openConfig();

    await config.set({
      key: "ui.theme",
      scope: "global",
      envelope: configValue("dark"),
    });
    await config.set({
      key: "ui.theme",
      scope: "project",
      scopeId: projectId,
      envelope: configValue("light"),
    });
    await config.set({
      key: "ui.theme",
      scope: "user",
      scopeId: "operator",
      envelope: configValue("system"),
    });

    const effective = await config.getEffective("ui.theme", {
      projectId,
      userKey: "operator",
    });
    expect(effective?.source).toBe("user");
    expect(effective?.envelope).toEqual(configValue("system"));

    const projectOnly = await config.getEffective("ui.theme", {
      projectId,
      userKey: "other",
    });
    expect(projectOnly?.source).toBe("project");
    expect(projectOnly?.envelope).toEqual(configValue("light"));

    const globalOnly = await config.getEffective("ui.theme", {});
    expect(globalOnly?.source).toBe("global");
  });

  it("allows vault refs in config", async () => {
    const { config } = await openConfig();
    await config.set({
      key: "ai.defaultProviderKeyRef",
      scope: "global",
      envelope: configRef("vault:abc123"),
    });
    const got = await config.get({
      key: "ai.defaultProviderKeyRef",
      scope: "global",
    });
    expect(got).toEqual(configRef("vault:abc123"));
  });
});

describe("@clime/config ≠ governance", () => {
  it("rejects governance / feature / policy / kill switch keys", async () => {
    const { config } = await openConfig();
    const forbidden = [
      "feature.missionCenter.start",
      "policy.maxRetries",
      "governance.admit",
      "kill_switch",
      "killSwitch",
      "capability.canPublish",
    ];
    for (const key of forbidden) {
      expect(isGovernanceReservedKey(key)).toBe(true);
      await expect(
        config.set({
          key,
          scope: "global",
          envelope: configValue(true),
        }),
      ).rejects.toBeInstanceOf(ConfigForbiddenKeyError);
    }
  });

  it("rejects Workspace / Team Mode keys (L+ only)", async () => {
    const { config } = await openConfig();
    for (const key of ["workspace", "workspace.default", "team", "team.role"]) {
      await expect(
        config.set({
          key,
          scope: "global",
          envelope: configValue(true),
        }),
      ).rejects.toBeInstanceOf(ConfigForbiddenKeyError);
    }
  });

  it("lists cascade layers and Domain settings handlers reject workspace", async () => {
    const { config, projectId } = await openConfig();
    const { createSettingsDomainHandlers } = await import("./api.js");
    await config.set({
      key: "ui.theme",
      scope: "global",
      envelope: configValue("light"),
    });
    const listed = await config.list({ scope: "global" });
    expect(listed.some((i) => i.key === "ui.theme")).toBe(true);

    const handlers = createSettingsDomainHandlers(config, {
      defaultProjectId: projectId,
      defaultUserKey: "local",
    });
    const ctx = { requestId: "r1", traceId: "t1", projectId };
    const denied = (await handlers["settings.setGlobal"]!(
      { key: "workspace.slug", value: "acme" },
      ctx,
    )) as { saved: boolean; code?: string };
    expect(denied.saved).toBe(false);
    expect(denied.code).toBe("WORKSPACE_FORBIDDEN");

    const ok = (await handlers["settings.setUser"]!(
      { key: "ui.density", value: "compact" },
      ctx,
    )) as { saved: boolean };
    expect(ok.saved).toBe(true);
    const user = (await handlers["settings.getUser"]!({}, ctx)) as {
      scope: string;
      items: Array<{ key: string }>;
    };
    expect(user.scope).toBe("user");
    expect(user.items.some((i) => i.key === "ui.density")).toBe(true);
  });

  it("rejects plaintext secret heuristics", async () => {
    const { config } = await openConfig();
    await expect(
      config.set({
        key: "provider.openai",
        scope: "global",
        envelope: configValue("sk-abcdefghijklmnopqrstuvwxyz"),
      }),
    ).rejects.toBeInstanceOf(ConfigSecretRejectedError);

    await expect(
      config.set({
        key: "my_api_key",
        scope: "global",
        envelope: configValue("not-even-needed"),
      }),
    ).rejects.toBeInstanceOf(ConfigSecretRejectedError);
  });
});
