import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { SCHEMA_VERSION } from "@clime/shared";
import { z } from "zod";
import {
  createDailyGrowthDsl,
  validateTemplateDsl,
  type WorkflowDsl,
} from "./dsl.js";
import type { WorkflowTemplate } from "./types.js";

/** vg-a badge subset embedded in playbook share footer (no growth-research dep). */
export const climeReferralBadgeSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  kind: z.literal("clime.referral_badge"),
  wordmark: z.literal("Powered by CLIME Growth OS"),
  referralCode: z.string().min(1),
  referralUrl: z
    .string()
    .min(1)
    .refine((u) => /^https:\/\/[^\s]+$/i.test(u), "referralUrl must be https"),
  locale: z.string().optional(),
  placedOn: z.enum([
    "micro_audit_export",
    "clime_playbook_share",
    "other_viral",
  ]),
});

const promptPurposeSchema = z.enum([
  "research_summarize",
  "content_longform",
  "content_short",
  "validate_json",
  "repurpose",
  "micro_audit",
  "trend_multijack",
  "generic",
]);

const channelIdSchema = z.enum([
  "x_thread",
  "instagram",
  "tiktok",
  "threads",
  "linkedin",
  "youtube_shorts",
  "blog",
]);

/**
 * vg-a §6.2 / vg-d — ClimePlaybookV1 (schema_version numeric 1 = monorepo SCHEMA_VERSION).
 */
export const climePlaybookV1Schema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  kind: z.literal("clime.playbook"),
  title: z.string().min(1),
  summary: z.string().optional(),
  createdAt: z.string().min(1),
  authorLabel: z.string().optional(),
  referral: climeReferralBadgeSchema.optional(),
  workflow: z.object({
    schema_version: z.string().min(1),
    document: z.record(z.string(), z.unknown()),
  }),
  prompts: z.array(
    z.object({
      id: z.string().min(1),
      version: z.string().min(1),
      purpose: promptPurposeSchema,
      template: z.string().min(1),
    }),
  ),
  timing: z.object({
    timezone: z.string().optional(),
    preferredHoursLocal: z.array(z.number().int().min(0).max(23)).optional(),
    cadence: z.enum(["once", "daily", "weekly", "custom"]).optional(),
    jitterPolicy: z.enum(["none", "gaussian_5_45s"]).optional(),
  }),
  targeting: z
    .object({
      personaHints: z.array(z.string()).optional(),
      channels: z.array(channelIdSchema).optional(),
      locales: z.array(z.string()).optional(),
    })
    .optional(),
  provenance: z.object({
    generator: z.literal("clime.ai.growth_studio"),
    contentHash: z.string().optional(),
    parentPlaybookId: z.string().optional(),
  }),
});

export type ClimePlaybookV1 = z.infer<typeof climePlaybookV1Schema>;

const SECRET_PATTERN =
  /(api[_-]?key|secret|token|password|cookie|vault:|session|bearer\s+[a-z0-9]|sk-[a-z0-9])/i;

export type ClimePlaybookExportInput = {
  title: string;
  summary?: string;
  authorLabel?: string;
  dsl?: WorkflowDsl;
  prompts?: ClimePlaybookV1["prompts"];
  timing?: ClimePlaybookV1["timing"];
  targeting?: ClimePlaybookV1["targeting"];
  referralCode?: string;
  includeReferral?: boolean;
  parentPlaybookId?: string;
  now?: string;
};

export type ClimePlaybookExportResult =
  | { ok: true; playbook: ClimePlaybookV1; json: string }
  | { ok: false; code: string; message: string; errors?: string[] };

export type ClimePlaybookImportResult =
  | {
      ok: true;
      playbook: ClimePlaybookV1;
      template: WorkflowTemplate;
      autoStarted: false;
    }
  | { ok: false; code: string; message: string; errors?: string[]; traceId?: string };

function defaultPrompts(): ClimePlaybookV1["prompts"] {
  return [
    {
      id: "prompt.micro_audit",
      version: "1",
      purpose: "micro_audit",
      template: "Diagnose public source {{url}} for CLIME-fit gaps. paidApiRequired=false.",
    },
    {
      id: "prompt.trend_multijack",
      version: "1",
      purpose: "trend_multijack",
      template: "Expand hot topic {{topic}} into meme/card/shorts/threads. free_local only.",
    },
  ];
}

function stripSecretsFromString(value: string): string | null {
  if (SECRET_PATTERN.test(value)) return null;
  return value;
}

function assertNoSecrets(playbook: ClimePlaybookV1): string[] {
  const blob = JSON.stringify(playbook);
  const errors: string[] = [];
  if (SECRET_PATTERN.test(blob)) {
    errors.push("Playbook contains forbidden secret-like material");
  }
  for (const p of playbook.prompts) {
    if (SECRET_PATTERN.test(p.template)) {
      errors.push(`Prompt ${p.id} looks like it embeds secrets`);
    }
  }
  return errors;
}

function contentHash(playbook: Omit<ClimePlaybookV1, "provenance"> & {
  provenance: Omit<ClimePlaybookV1["provenance"], "contentHash">;
}): string {
  const canonical = JSON.stringify(playbook);
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}

/**
 * Serialize workflow + prompts + timing → ClimePlaybookV1 (vg-d).
 * Distinct from content Export backup (c1-c).
 */
export function buildClimePlaybook(
  input: ClimePlaybookExportInput,
): ClimePlaybookExportResult {
  const dsl = input.dsl ?? createDailyGrowthDsl();
  const validated = validateTemplateDsl(dsl);
  if (!validated.ok) {
    return {
      ok: false,
      code: "INVALID_WORKFLOW",
      message: "Workflow DSL failed validation",
      errors: validated.errors,
    };
  }

  const createdAt = input.now ?? new Date().toISOString();
  const prompts = (input.prompts ?? defaultPrompts()).map((p) => ({
    ...p,
    template: stripSecretsFromString(p.template) ?? "[stripped]",
  }));

  const referral =
    input.includeReferral === false
      ? undefined
      : {
          schema_version: SCHEMA_VERSION,
          kind: "clime.referral_badge" as const,
          wordmark: "Powered by CLIME Growth OS" as const,
          referralCode: input.referralCode?.trim() || "playbook_share",
          referralUrl: `https://clime.growth/r/${encodeURIComponent(input.referralCode?.trim() || "playbook_share")}`,
          placedOn: "clime_playbook_share" as const,
        };

  const base = {
    schema_version: SCHEMA_VERSION,
    kind: "clime.playbook" as const,
    title: input.title.trim(),
    summary: input.summary,
    createdAt,
    authorLabel: input.authorLabel,
    referral,
    workflow: {
      schema_version: String(validated.dsl.schema_version),
      document: validated.dsl as unknown as Record<string, unknown>,
    },
    prompts,
    timing: input.timing ?? {
      cadence: "daily" as const,
      jitterPolicy: "gaussian_5_45s" as const,
    },
    targeting: input.targeting,
    provenance: {
      generator: "clime.ai.growth_studio" as const,
      parentPlaybookId: input.parentPlaybookId,
    },
  };

  const withHash: ClimePlaybookV1 = {
    ...base,
    provenance: {
      ...base.provenance,
      contentHash: contentHash(base),
    },
  };

  const parsed = climePlaybookV1Schema.safeParse(withHash);
  if (!parsed.success) {
    return {
      ok: false,
      code: "SCHEMA_INVALID",
      message: "Playbook failed Zod boundary",
      errors: parsed.error.issues.map((i) => i.message),
    };
  }

  const secretErrors = assertNoSecrets(parsed.data);
  if (secretErrors.length > 0) {
    return {
      ok: false,
      code: "SECRETS_FORBIDDEN",
      message: secretErrors.join("; "),
      errors: secretErrors,
    };
  }

  return {
    ok: true,
    playbook: parsed.data,
    json: `${JSON.stringify(parsed.data, null, 2)}\n`,
  };
}

export function writeClimePlaybookFile(
  filePath: string,
  input: ClimePlaybookExportInput,
): ClimePlaybookExportResult & { filePath?: string } {
  if (!filePath.endsWith(".clime")) {
    return {
      ok: false,
      code: "EXTENSION_REQUIRED",
      message: "Playbook export path must end with .clime",
    };
  }
  if (filePath.replace(/\\/g, "/").includes("/Exports/")) {
    return {
      ok: false,
      code: "EXPORT_BACKUP_PATH_FORBIDDEN",
      message: ".clime must not be written under Exports/ (c1-c backup only)",
    };
  }
  const built = buildClimePlaybook(input);
  if (!built.ok) return built;
  writeFileSync(filePath, built.json, "utf8");
  return { ...built, filePath };
}

/**
 * Import .clime → Mission/Workflow template. Never auto-START (vg-a §6.3).
 */
export function parseClimePlaybook(raw: unknown): ClimePlaybookImportResult {
  const parsed = climePlaybookV1Schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "SCHEMA_REJECT",
      message: "Unknown or invalid .clime schema_version/kind",
      errors: parsed.error.issues.map((i) => i.message),
    };
  }

  const secretErrors = assertNoSecrets(parsed.data);
  if (secretErrors.length > 0) {
    return {
      ok: false,
      code: "SECRETS_FORBIDDEN",
      message: secretErrors.join("; "),
      errors: secretErrors,
    };
  }

  const dslCheck = validateTemplateDsl(parsed.data.workflow.document);
  if (!dslCheck.ok) {
    return {
      ok: false,
      code: "WORKFLOW_REJECT",
      message: "Embedded workflow DSL not importable",
      errors: dslCheck.errors,
    };
  }

  const template: WorkflowTemplate = {
    schema_version: SCHEMA_VERSION,
    id: `clime_import_${dslCheck.dsl.id}`,
    name: parsed.data.title,
    dsl: dslCheck.dsl,
  };

  return {
    ok: true,
    playbook: parsed.data,
    template,
    autoStarted: false,
  };
}

export function importClimePlaybookFile(
  filePath: string,
  options?: { traceId?: string },
): ClimePlaybookImportResult {
  if (!basename(filePath).endsWith(".clime") && !filePath.endsWith(".clime")) {
    return {
      ok: false,
      code: "EXTENSION_REQUIRED",
      message: "Import requires .clime file",
      traceId: options?.traceId,
    };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (e) {
    return {
      ok: false,
      code: "READ_FAILED",
      message: e instanceof Error ? e.message : "Failed to read .clime",
      traceId: options?.traceId,
    };
  }
  const result = parseClimePlaybook(raw);
  if (!result.ok) {
    return { ...result, traceId: options?.traceId };
  }
  return result;
}
