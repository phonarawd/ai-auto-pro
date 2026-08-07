import type { TaskState } from "@clime/shared";
import type { FeatureManagementStorage } from "../persist/ports.js";
import type { GovernorMetricsPort } from "../types.js";
import { parsePolicyRuleJson } from "../zod/policy-rule.js";

const TERMINAL_STATES = new Set<TaskState>([
  "PUBLISHED",
  "FAILED",
  "CANCELLED",
]);

export function isTerminalTaskState(state: string): boolean {
  return TERMINAL_STATES.has(state as TaskState);
}

export async function isKillSwitchActive(
  storage: FeatureManagementStorage,
  projectId?: string | null,
): Promise<{ active: boolean; reason: string | null; scope: string }> {
  if (projectId) {
    const projectKill = await storage.policies.getKillSwitch(
      "project",
      projectId,
    );
    if (projectKill?.active === 1) {
      return {
        active: true,
        reason: projectKill.reason,
        scope: "project",
      };
    }
  }

  const globalKill = await storage.policies.getKillSwitch("global", null);
  if (globalKill?.active === 1) {
    return {
      active: true,
      reason: globalKill.reason,
      scope: "global",
    };
  }

  return { active: false, reason: null, scope: "global" };
}

export async function defaultCountActiveRuns(
  storage: FeatureManagementStorage,
  projectId: string | null,
): Promise<number> {
  if (!projectId) return 0;
  const runs = await storage.workflowRuns.listByProject(projectId, 500);
  return runs.filter((r) => !isTerminalTaskState(r.state)).length;
}

export async function evaluateGovernorLimits(input: {
  storage: FeatureManagementStorage;
  projectId?: string | null;
  featureKey: string;
  costUnits?: number;
  governorMetrics?: GovernorMetricsPort;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const rules = await input.storage.policies.listRules("global", null);
  const projectRules = input.projectId
    ? await input.storage.policies.listRules("project", input.projectId)
    : [];
  const all = [...rules, ...projectRules].filter((r) => r.enabled === 1);

  let maxConcurrent: number | undefined;
  let maxCost: number | undefined;

  for (const rule of all) {
    if (
      rule.featureKey != null &&
      rule.featureKey !== input.featureKey
    ) {
      continue;
    }
    const parsed = parsePolicyRuleJson(rule.ruleJson);
    if (!parsed.ok || !parsed.known || parsed.known.kind !== "governor_limits") {
      continue;
    }
    if (parsed.known.maxConcurrentRuns != null) {
      maxConcurrent =
        maxConcurrent == null
          ? parsed.known.maxConcurrentRuns
          : Math.min(maxConcurrent, parsed.known.maxConcurrentRuns);
    }
    if (parsed.known.maxCostUnits != null) {
      maxCost =
        maxCost == null
          ? parsed.known.maxCostUnits
          : Math.min(maxCost, parsed.known.maxCostUnits);
    }
  }

  if (maxConcurrent != null) {
    const count = input.governorMetrics
      ? await input.governorMetrics.countActiveRuns(input.projectId ?? null)
      : await defaultCountActiveRuns(input.storage, input.projectId ?? null);
    if (count >= maxConcurrent) {
      return {
        ok: false,
        message: `Governor concurrency limit reached (${count}/${maxConcurrent})`,
      };
    }
  }

  if (maxCost != null && input.costUnits != null && input.costUnits > maxCost) {
    return {
      ok: false,
      message: `Governor cost envelope exceeded (${input.costUnits}/${maxCost})`,
    };
  }

  return { ok: true };
}
