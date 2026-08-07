import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createAndSeedSqliteStorage } from "@clime/storage";
import { afterEach, describe, expect, it } from "vitest";
import {
  createConfigStore,
  createSettingsDomainHandlers,
  configValue,
  isWorkspaceOrTeamKey,
} from "./index.js";

const here = dirname(fileURLToPath(import.meta.url));
const closers: Array<() => void> = [];

afterEach(() => {
  while (closers.length) closers.pop()?.();
});

describe("K1-C Settings cascade prove", () => {
  it("cascade User > Project > Global + workspace keys forbidden", async () => {
    const { storage } = await createAndSeedSqliteStorage({ path: ":memory:" });
    closers.push(() => storage.close());
    const project = await storage.projects.create({ name: "k1" });
    const config = createConfigStore({ settings: storage.settings });

    await config.set({
      key: "ui.theme",
      scope: "global",
      envelope: configValue("g"),
    });
    await config.set({
      key: "ui.theme",
      scope: "project",
      scopeId: project.id,
      envelope: configValue("p"),
    });
    await config.set({
      key: "ui.theme",
      scope: "user",
      scopeId: "local",
      envelope: configValue("u"),
    });

    const effective = await config.getEffective("ui.theme", {
      projectId: project.id,
      userKey: "local",
    });
    expect(effective?.source).toBe("user");
    expect(effective?.envelope).toEqual(configValue("u"));

    expect(isWorkspaceOrTeamKey("workspace.slug")).toBe(true);
    expect(isWorkspaceOrTeamKey("ui.theme")).toBe(false);

    const handlers = createSettingsDomainHandlers(config, {
      defaultProjectId: project.id,
    });
    const denied = (await handlers["settings.setProject"]!(
      { key: "team.role", value: "admin" },
      { requestId: "r", traceId: "t", projectId: project.id },
    )) as { saved: boolean; code?: string };
    expect(denied.saved).toBe(false);
    expect(denied.code).toBe("WORKSPACE_FORBIDDEN");
  });

  it("source forbids Workspace settings UI / Team Mode surface", () => {
    const forbidden = readFileSync(join(here, "forbidden-keys.ts"), "utf8");
    expect(forbidden).toContain("workspace.");
    expect(forbidden).toContain("team.");
    const api = readFileSync(join(here, "api.ts"), "utf8");
    expect(api).toContain("WORKSPACE_FORBIDDEN");
    expect(api).not.toMatch(/scope:\s*["']workspace["']/);
  });
});
