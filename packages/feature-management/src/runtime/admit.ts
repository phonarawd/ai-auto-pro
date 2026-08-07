import { withSchemaVersion } from "@clime/shared";
import type { FeatureManagementDeps } from "../persist/ports.js";
import { noopEventSink } from "../persist/ports.js";
import type {
  AdmitDecision,
  AdmitInput,
  AdmitTerminalHint,
  GovernanceDenyCode,
} from "../types.js";
import { parsePolicyRuleJson } from "../zod/policy-rule.js";
import {
  evaluateGovernorLimits,
  isKillSwitchActive,
} from "./governor.js";
import {
  featureLifecycleAllows,
  resolveFeatureLifecycle,
} from "./resolve-feature.js";

async function auditDeny(
  deps: FeatureManagementDeps,
  input: AdmitInput,
  code: string,
  message: string,
): Promise<void> {
  await deps.storage.audit.append({
    projectId: input.projectId ?? null,
    kind: `governance.deny.${code}`,
    actor: null,
    payloadJson: JSON.stringify(
      withSchemaVersion({
        data: {
          featureKey: input.featureKey,
          code,
          message,
        },
      }),
    ),
    traceId: input.traceId,
    occurredAt: new Date().toISOString(),
  });
}

async function emitDeny(
  deps: FeatureManagementDeps,
  type: "FeatureFlagDenied" | "PolicyDenied" | "GovernorThrottled",
  input: AdmitInput,
  extra: Record<string, unknown>,
): Promise<void> {
  const sink = deps.events ?? noopEventSink;
  await sink.emit({
    type,
    traceId: input.traceId,
    payload: { featureKey: input.featureKey, ...extra },
  });
}

/**
 * Feature → Policy → Capability → Governor (+ Kill Switch first).
 * Engines MUST call before side effects (S25A §1 / §5).
 */
export async function admit(
  deps: FeatureManagementDeps,
  input: AdmitInput,
): Promise<AdmitDecision> {
  const kill = await isKillSwitchActive(deps.storage, input.projectId);
  if (kill.active) {
    const message = kill.reason ?? "Kill Switch is active";
    await auditDeny(deps, input, "KILL_SWITCH", message);
    return {
      ok: false,
      code: "KILL_SWITCH",
      message,
      traceId: input.traceId,
      terminalHint: "CANCELLED",
    };
  }

  const feature = await resolveFeatureLifecycle(
    deps.storage,
    input.featureKey,
    input.projectId,
    input.userKey,
  );
  if (!featureLifecycleAllows(feature.lifecycle)) {
    const message = `Feature ${input.featureKey} is ${feature.lifecycle}`;
    await auditDeny(deps, input, "FEATURE_DISABLED", message);
    await emitDeny(deps, "FeatureFlagDenied", input, {
      lifecycle: feature.lifecycle,
    });
    return {
      ok: false,
      code: "FEATURE_DISABLED",
      message,
      traceId: input.traceId,
      terminalHint: "BLOCKED_POLICY",
    };
  }

  const policyResult = await evaluatePolicies(deps, input);
  if (!policyResult.ok) {
    await auditDeny(deps, input, policyResult.code, policyResult.message);
    await emitDeny(deps, "PolicyDenied", input, { code: policyResult.code });
    return {
      ok: false,
      code: policyResult.code,
      message: policyResult.message,
      traceId: input.traceId,
      terminalHint: policyResult.terminalHint,
    };
  }

  if (input.platformSideEffect) {
    if (!input.accountId) {
      const message = "Platform side effect requires accountId";
      await auditDeny(deps, input, "CAPABILITY_DENIED", message);
      return {
        ok: false,
        code: "CAPABILITY_DENIED",
        message,
        traceId: input.traceId,
        terminalHint: "BLOCKED_CAPABILITY",
      };
    }
    if (deps.capability) {
      const cap = await deps.capability.allowsPublish({
        accountId: input.accountId,
        publishMode: input.publishMode,
      });
      if (!cap.ok) {
        await auditDeny(deps, input, "CAPABILITY_DENIED", cap.reason);
        return {
          ok: false,
          code: "CAPABILITY_DENIED",
          message: cap.reason,
          traceId: input.traceId,
          terminalHint: "BLOCKED_CAPABILITY",
        };
      }
    }
  }

  const gov = await evaluateGovernorLimits({
    storage: deps.storage,
    projectId: input.projectId,
    featureKey: input.featureKey,
    costUnits: input.costUnits,
    governorMetrics: deps.governorMetrics,
  });
  if (!gov.ok) {
    await auditDeny(deps, input, "GOVERNOR_THROTTLED", gov.message);
    await emitDeny(deps, "GovernorThrottled", input, { reason: gov.message });
    return {
      ok: false,
      code: "GOVERNOR_THROTTLED",
      message: gov.message,
      traceId: input.traceId,
      terminalHint: "BLOCKED_POLICY",
    };
  }

  return { ok: true, traceId: input.traceId };
}

async function evaluatePolicies(
  deps: FeatureManagementDeps,
  input: AdmitInput,
): Promise<
  | { ok: true }
  | {
      ok: false;
      code: Extract<GovernanceDenyCode, "POLICY_DENIED" | "VALIDATION_FAILED">;
      message: string;
      terminalHint: AdmitTerminalHint;
    }
> {
  const scopes: Array<{ scope: string; scopeId: string | null }> = [
    { scope: "global", scopeId: null },
  ];
  if (input.projectId) {
    scopes.push({ scope: "project", scopeId: input.projectId });
  }

  const rules = [];
  for (const s of scopes) {
    rules.push(...(await deps.storage.policies.listRules(s.scope, s.scopeId)));
  }

  for (const rule of rules) {
    if (rule.enabled !== 1) continue;
    if (rule.featureKey != null && rule.featureKey !== input.featureKey) {
      continue;
    }

    const parsed = parsePolicyRuleJson(rule.ruleJson);
    if (!parsed.ok) {
      return {
        ok: false,
        code: "POLICY_DENIED",
        message: parsed.message,
        terminalHint: "BLOCKED_POLICY",
      };
    }

    if (!parsed.known) {
      continue;
    }

    if (parsed.known.kind === "baseline") {
      if (parsed.known.humanApprovalRequired && !input.humanApproved) {
        return {
          ok: false,
          code: "POLICY_DENIED",
          message: "Policy requires human approval",
          terminalHint: "BLOCKED_HUMAN",
        };
      }
    }

    if (parsed.known.kind === "publish_gate") {
      if (parsed.known.requireValidate && input.validated !== true) {
        return {
          ok: false,
          code: "VALIDATION_FAILED",
          message: "Publish policy requires Validate before proceed",
          terminalHint: "BLOCKED_POLICY",
        };
      }
      if (
        parsed.known.requireCapability &&
        input.platformSideEffect &&
        !input.accountId
      ) {
        return {
          ok: false,
          code: "POLICY_DENIED",
          message: "Publish policy requires Capability (accountId)",
          terminalHint: "BLOCKED_CAPABILITY",
        };
      }
    }
  }

  return { ok: true };
}
