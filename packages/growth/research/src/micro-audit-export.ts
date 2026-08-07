import { mkdirSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { buildSimplePdf } from "./pdf-lite.js";
import {
  buildClimeReferralBadge,
  formatBadgeFooter,
  POWERED_BY_WORDMARK,
} from "./referral-badge.js";
import type { MicroAuditTeardown } from "./schemas.js";
import {
  microAuditViralExportManifestSchema,
  type MicroAuditViralExportManifest,
} from "./viral-schemas.js";

export type MicroAuditViralExportInput = {
  audit: MicroAuditTeardown;
  /** Root directory; pack written under ViralExports/micro-audit/YYYY-MM-DD/ */
  exportRoot: string;
  exportDate?: string;
  referralCode?: string;
  locale?: string;
  /** V1 default = badge on (vg-a §3.2). */
  includeBadge?: boolean;
  now?: () => string;
};

export type MicroAuditViralExportResult =
  | {
      ok: true;
      exportPath: string;
      relativePath: string;
      pdfPath: string;
      infographicPath: string;
      manifest: MicroAuditViralExportManifest;
      files: string[];
    }
  | { ok: false; code: string; message: string };

function utcDate(now: string): string {
  return now.slice(0, 10);
}

function listFilesRecursive(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listFilesRecursive(full));
    else out.push(full);
  }
  return out;
}

function buildInfographicMarkdown(
  audit: MicroAuditTeardown,
  badgeFooter: string,
): string {
  return [
    `# CLIME Micro-Audit — ${audit.id}`,
    "",
    `**Source:** ${audit.sourceUrl} (${audit.sourceKind})`,
    `**Diagnosed:** ${audit.diagnosedAt}`,
    `**Trend fit:** ${(audit.trendFit.score * 100).toFixed(0)}%`,
    "",
    "## Trend notes",
    ...audit.trendFit.notes.map((n) => `- ${n}`),
    "",
    "## Copy patterns",
    ...audit.copyPatterns.map((n) => `- ${n}`),
    "",
    "## Keyword / gap",
    ...audit.keywordGapNotes.map((n) => `- ${n}`),
    "",
    "## CLIME-fit tips",
    ...audit.climeFitTips.map((n) => `- ${n}`),
    "",
    "## Playbook hints",
    ...audit.playbookHints.map((n) => `- ${n}`),
    "",
    badgeFooter,
    "",
    `_paidApiRequired: false · ${POWERED_BY_WORDMARK}_`,
  ].join("\n");
}

function buildPdfLines(audit: MicroAuditTeardown, badgeFooter: string): string[] {
  const lines: string[] = [
    "CLIME AI Growth Studio — Micro-Audit",
    `ID: ${audit.id}`,
    `Source: ${audit.sourceUrl}`,
    `Kind: ${audit.sourceKind}`,
    `Diagnosed: ${audit.diagnosedAt}`,
    `Trend fit: ${audit.trendFit.score.toFixed(3)}`,
    "",
    "Trend notes:",
    ...audit.trendFit.notes.map((n) => `* ${n}`),
    "",
    "Copy patterns:",
    ...audit.copyPatterns.map((n) => `* ${n}`),
    "",
    "Keyword gaps:",
    ...audit.keywordGapNotes.map((n) => `* ${n}`),
    "",
    "CLIME-fit tips:",
    ...audit.climeFitTips.map((n) => `* ${n}`),
    "",
    "Playbook hints:",
    ...audit.playbookHints.map((n) => `* ${n}`),
    "",
    ...badgeFooter.split("\n"),
    "",
    "paidApiRequired: false",
  ];
  return lines.slice(0, 48);
}

/**
 * vg-b / vg-a §1 viral export — PDF + infographic + badge + referral.
 * Never writes under Exports/ (c1-c backup) and never writes *.clime (vg-d).
 */
export function writeMicroAuditViralExport(
  input: MicroAuditViralExportInput,
): MicroAuditViralExportResult {
  if (input.includeBadge === false) {
    return {
      ok: false,
      code: "BADGE_REQUIRED",
      message:
        "V1 free viral path requires Powered-by badge + referral (vg-a §3 default on)",
    };
  }

  const createdAt = input.now?.() ?? new Date().toISOString();
  const exportDate = input.exportDate ?? utcDate(createdAt);
  const relativePath = `ViralExports/micro-audit/${exportDate}`;
  const dir = join(input.exportRoot, "ViralExports", "micro-audit", exportDate);

  if (relativePath.startsWith("Exports/")) {
    return {
      ok: false,
      code: "EXPORT_BACKUP_FORBIDDEN",
      message: "Micro-Audit viral export must not use Export backup path",
    };
  }

  mkdirSync(dir, { recursive: true });

  const badge = buildClimeReferralBadge({
    referralCode: input.referralCode,
    projectId: input.audit.projectId,
    placedOn: "micro_audit_export",
    locale: input.locale,
  });
  const badgeFooter = formatBadgeFooter(badge);

  const pdfName = "micro-audit.pdf";
  const infoName = "micro-audit-infographic.md";
  const manifestName = "manifest.json";

  const pdfPath = join(dir, pdfName);
  const infoPath = join(dir, infoName);

  writeFileSync(pdfPath, buildSimplePdf(buildPdfLines(input.audit, badgeFooter)));
  writeFileSync(
    infoPath,
    buildInfographicMarkdown(input.audit, badgeFooter),
    "utf8",
  );

  const files = [pdfName, infoName, manifestName];
  const manifest = microAuditViralExportManifestSchema.parse({
    schema_version: 1,
    kind: "growth.micro_audit_viral_export",
    projectId: input.audit.projectId,
    auditId: input.audit.id,
    exportDate,
    createdAt,
    relativePath,
    files,
    pdfPath: `${relativePath}/${pdfName}`,
    infographicPath: `${relativePath}/${infoName}`,
    referralBadge: badge,
    paidApiRequired: false,
    isExportBackup: false,
  });

  writeFileSync(join(dir, manifestName), JSON.stringify(manifest, null, 2), "utf8");

  const all = listFilesRecursive(dir);
  if (all.some((f) => f.endsWith(".clime"))) {
    return {
      ok: false,
      code: "CLIME_FORBIDDEN",
      message: "Viral Micro-Audit export must not write .clime (vg-d owns playbooks)",
    };
  }

  return {
    ok: true,
    exportPath: dir,
    relativePath,
    pdfPath,
    infographicPath: infoPath,
    manifest,
    files,
  };
}
