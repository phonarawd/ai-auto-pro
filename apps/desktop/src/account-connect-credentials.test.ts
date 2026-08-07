import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SCHEMA_VERSION } from "@clime/shared";
import { afterEach, describe, expect, it } from "vitest";
import { bootstrapDesktopDomainApi } from "./main/bootstrap-domain-api.js";

describe("account.connect with username/password", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const d of dirs.splice(0)) {
      try {
        rmSync(d, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  });

  it("vaults password and connects without returning plaintext", async () => {
    const vaultRoot = mkdtempSync(join(tmpdir(), "clime-vault-"));
    dirs.push(vaultRoot);
    const ipc = {
      handle: () => undefined,
      removeHandler: () => undefined,
    };
    const boot = bootstrapDesktopDomainApi(ipc, { vaultRootDir: vaultRoot });
    try {
      const res = await boot.host.handleIpcRequest("domain:account.connect", {
        requestId: "req_cred_1",
        schema_version: SCHEMA_VERSION,
        traceId: "tr_cred_1",
        args: {
          projectId: "seed_project_empty",
          platform: "naver",
          username: "demo@naver.com",
          password: "secret-pass-123",
          authMode: "session",
        },
      });
      if (!res.ok) {
        throw new Error(`connect failed: ${JSON.stringify(res)}`);
      }
      const data = res.data as {
        id?: string;
        accountName?: string;
        credentialRef?: string;
        password?: string;
      };
      expect(data.accountName).toBe("demo@naver.com");
      expect(data.credentialRef).toMatch(/^vault:/);
      expect(JSON.stringify(res)).not.toContain("secret-pass-123");

      const listed = boot.accountManager.listAccounts("seed_project_empty");
      expect(listed.some((a) => a.accountName === "demo@naver.com")).toBe(true);
      expect(listed.find((a) => a.accountName === "demo@naver.com")?.credentialRef).toMatch(
        /^vault:/,
      );

      // Persisted to SQLite and visible via Domain listAccounts after hydrate
      const listRes = await boot.host.handleIpcRequest("domain:account.listAccounts", {
        requestId: "req_cred_list",
        schema_version: SCHEMA_VERSION,
        traceId: "tr_cred_list",
        args: { projectId: "seed_project_empty" },
      });
      expect(listRes.ok).toBe(true);
      if (!listRes.ok) throw new Error("listAccounts failed");
      const rows = listRes.data as Array<{ accountName?: string }>;
      expect(rows.some((a) => a.accountName === "demo@naver.com")).toBe(true);
    } finally {
      await boot.close();
    }
  });
});
