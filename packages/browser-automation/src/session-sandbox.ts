/**
 * Per-account BAE session isolation — C2A §3.3 / x-a §2.
 * Cookie/profile handles must never be shared across accounts.
 */

export type SessionSandboxHandle = {
  schema_version: 1;
  sandboxId: string;
  accountId: string;
  platform: string;
  profileDirHint: string;
  createdAt: string;
};

export type SessionSandbox = {
  acquire(accountId: string, platform: string): SessionSandboxHandle;
  /** Returns true if two accounts would share isolation (must be false). */
  sharesContext(a: string, b: string): boolean;
  list(): SessionSandboxHandle[];
};

export function createSessionSandbox(): SessionSandbox {
  const byAccount = new Map<string, SessionSandboxHandle>();

  return {
    acquire(accountId, platform) {
      const existing = byAccount.get(accountId);
      if (existing && existing.platform === platform) return existing;

      const handle: SessionSandboxHandle = {
        schema_version: 1,
        sandboxId: `bae_sandbox_${accountId}_${platform}`,
        accountId,
        platform,
        profileDirHint: `profiles/${platform}/${accountId}`,
        createdAt: new Date().toISOString(),
      };
      byAccount.set(accountId, handle);
      return handle;
    },
    sharesContext(a, b) {
      if (a === b) return true;
      const ha = byAccount.get(a);
      const hb = byAccount.get(b);
      if (!ha || !hb) return false;
      return ha.sandboxId === hb.sandboxId || ha.profileDirHint === hb.profileDirHint;
    },
    list() {
      return Array.from(byAccount.values());
    },
  };
}
