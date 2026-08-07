import { ConfigForbiddenKeyError } from "./errors.js";

/** Keys / prefixes that belong to Governance or Capability — never Config. */
const EXACT_FORBIDDEN = new Set([
  "killSwitch",
  "kill_switch",
  "kill-switch",
  "workspace",
  "team",
]);

/** Workspace / Team Mode settings are L+ only — V1 cascade is Global→Project→User. */
const PREFIX_FORBIDDEN = [
  "governance.",
  "feature.",
  "policy.",
  "capability.",
  "workspace.",
  "team.",
] as const;

export function assertConfigKeyAllowed(key: string): void {
  if (!key || key.trim().length === 0) {
    throw new ConfigForbiddenKeyError(key);
  }
  if (EXACT_FORBIDDEN.has(key)) {
    throw new ConfigForbiddenKeyError(key);
  }
  for (const prefix of PREFIX_FORBIDDEN) {
    if (key.startsWith(prefix)) {
      throw new ConfigForbiddenKeyError(key);
    }
  }
}

/** True when key is reserved for Team Mode / Workspace (L+) — not V1 Settings. */
export function isWorkspaceOrTeamKey(key: string): boolean {
  if (!key) return false;
  if (key === "workspace" || key === "team") return true;
  return key.startsWith("workspace.") || key.startsWith("team.");
}

export function isGovernanceReservedKey(key: string): boolean {
  try {
    assertConfigKeyAllowed(key);
    return false;
  } catch {
    return true;
  }
}
