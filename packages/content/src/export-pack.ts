import { mkdirSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { SCHEMA_VERSION } from "@clime/shared";
import {
  CHANNEL_TEMPLATES,
  isRepurposeChannelId,
  type RepurposeChannelId,
} from "./channels.js";
import { parseArtifactMeta } from "./meta.js";
import {
  CONTENT_ERROR_CODES,
  exportAccountsSchema,
  exportManifestSchema,
  type ExportManifest,
} from "./schemas.js";

export type ExportItemInput = {
  contentItemId: string;
  channel: string;
  targetAccountId: string | null;
  metaJson: string;
};

export type ExportPackInput = {
  projectId: string;
  items: ExportItemInput[];
  /** Absolute or relative root; pack written under `{exportRoot}/Exports/YYYY-MM-DD/`. */
  exportRoot: string;
  /** UTC calendar day override */
  exportDate?: string;
  packId?: string;
  now?: () => string;
};

export type ExportPackResult =
  | {
      ok: true;
      exportPath: string;
      relativePath: string;
      files: string[];
      manifest: ExportManifest;
    }
  | {
      ok: false;
      code: string;
      message: string;
      errors?: string[];
    };

function utcDate(now: string): string {
  return now.slice(0, 10);
}

function listFilesRecursive(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listFilesRecursive(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

/**
 * Write Export backup pack only — C1A §7 / vg-a Export≠.clime.
 * Never writes `*.clime`.
 */
export function writeExportBackupPack(input: ExportPackInput): ExportPackResult {
  if (input.items.length === 0) {
    return {
      ok: false,
      code: CONTENT_ERROR_CODES.INVALID_ARTIFACT,
      message: "exportPack requires at least one content item",
    };
  }

  const createdAt = input.now?.() ?? new Date().toISOString();
  const exportDate = input.exportDate ?? utcDate(createdAt);
  const relativePath = join("Exports", exportDate).replace(/\\/g, "/");
  const dir = join(input.exportRoot, "Exports", exportDate);

  mkdirSync(dir, { recursive: true });

  const accounts: Array<{
    contentItemId: string;
    channel: string;
    targetAccountId: string | null;
    file: string;
  }> = [];
  const writtenFiles: string[] = [];
  const hashtags = new Set<string>();
  let promptText = "";

  for (const item of input.items) {
    const parsed = parseArtifactMeta(item.metaJson);
    if (!parsed.ok) {
      return {
        ok: false,
        code: CONTENT_ERROR_CODES.INVALID_ARTIFACT,
        message: `Invalid artifact meta for ${item.contentItemId}`,
        errors: parsed.errors,
      };
    }
    const meta = parsed.meta;
    if (meta.prompt && !promptText) promptText = meta.prompt;
    for (const tag of meta.hashtags ?? []) hashtags.add(tag);

    let fileName: string;
    if (isRepurposeChannelId(item.channel)) {
      fileName = CHANNEL_TEMPLATES[item.channel as RepurposeChannelId].exportFileName;
    } else if (item.channel === "source") {
      fileName = "Source.txt";
    } else {
      fileName = `${item.channel.replace(/[^\w.-]+/g, "_")}.txt`;
    }

    // Collision: append short id suffix
    let finalName = fileName;
    if (writtenFiles.includes(finalName)) {
      const stem = fileName.replace(/(\.\w+)$/, "");
      const ext = fileName.slice(stem.length);
      finalName = `${stem}_${item.contentItemId.slice(0, 8)}${ext}`;
    }

    if (finalName.endsWith(".clime") || finalName.includes(".clime")) {
      return {
        ok: false,
        code: CONTENT_ERROR_CODES.EXPORT_CLIME_FORBIDDEN,
        message: "Export backup must not write .clime files (vg-d owns playbooks)",
      };
    }

    writeFileSync(join(dir, finalName), meta.body, "utf8");
    writtenFiles.push(finalName);
    accounts.push({
      contentItemId: item.contentItemId,
      channel: item.channel,
      targetAccountId: item.targetAccountId,
      file: finalName,
    });
  }

  writeFileSync(join(dir, "Prompt.txt"), promptText || "(no prompt recorded)", "utf8");
  writtenFiles.push("Prompt.txt");

  if (hashtags.size > 0) {
    writeFileSync(
      join(dir, "Hashtags.txt"),
      [...hashtags].map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" "),
      "utf8",
    );
    writtenFiles.push("Hashtags.txt");
  }

  const accountsDoc = exportAccountsSchema.parse({
    schema_version: SCHEMA_VERSION,
    kind: "content.export_accounts" as const,
    accounts,
  });
  writeFileSync(
    join(dir, "accounts.json"),
    JSON.stringify(accountsDoc, null, 2),
    "utf8",
  );
  writtenFiles.push("accounts.json");

  const manifest = exportManifestSchema.parse({
    schema_version: SCHEMA_VERSION,
    kind: "content.export_backup" as const,
    exportDate,
    projectId: input.projectId,
    contentItemIds: input.items.map((i) => i.contentItemId),
    files: writtenFiles,
    packId: input.packId,
    createdAt,
  });
  writeFileSync(
    join(dir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );
  writtenFiles.push("manifest.json");

  // Hard prove: no .clime under this pack
  const allFiles = listFilesRecursive(dir);
  const climeFiles = allFiles.filter((f) => f.endsWith(".clime"));
  if (climeFiles.length > 0) {
    return {
      ok: false,
      code: CONTENT_ERROR_CODES.EXPORT_CLIME_FORBIDDEN,
      message: `Export backup wrote forbidden .clime: ${climeFiles.map((f) => relative(dir, f)).join(", ")}`,
    };
  }

  return {
    ok: true,
    exportPath: dir,
    relativePath,
    files: writtenFiles,
    manifest,
  };
}
