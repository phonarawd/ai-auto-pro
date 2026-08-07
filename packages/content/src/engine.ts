import { randomUUID } from "node:crypto";
import { SCHEMA_VERSION, withSchemaVersion } from "@clime/shared";
import type { ClimeStorage } from "@clime/storage";
import {
  CHANNEL_TEMPLATES,
  listChannelTemplates,
  REPURPOSE_CHANNEL_IDS,
  SOURCE_CHANNEL_ID,
  type RepurposeChannelId,
} from "./channels.js";
import { writeExportBackupPack } from "./export-pack.js";
import { parseHistoryKind } from "./history.js";
import { buildArtifactMeta, parseArtifactMeta, serializeArtifactMeta } from "./meta.js";
import {
  CONTENT_ERROR_CODES,
  contentLifecycleStatusSchema,
  type ContentLifecycleStatus,
} from "./schemas.js";
import {
  assertValidatedStatus,
  runValidate,
  type BrandRules,
} from "./validate.js";

export type ContentStorage = Pick<ClimeStorage, "content">;

/** Optional Brand Intelligence loader — injected from growth/research at host. */
export type BrandRulesLoader = (projectId: string) => Promise<BrandRules | undefined>;

export type ContentEngineOptions = {
  loadBrandRules?: BrandRulesLoader;
};

export type ProduceInput = {
  projectId: string;
  body: string;
  title?: string;
  prompt?: string;
  channel?: string;
  format?: string;
  targetAccountId?: string | null;
  workflowRunId?: string | null;
  traceId: string;
  hooks?: string[];
  hashtags?: string[];
};

export type ContentEngine = {
  produce(input: ProduceInput): Promise<{
    schema_version: 1;
    contentItemId: string;
    status: "draft";
    traceId: string;
  }>;
  getArtifact(contentItemId: string): Promise<unknown | null>;
  validate(input: {
    contentItemId: string;
    brand?: BrandRules;
    /** When true, skip BrandRulesLoader (tests / explicit override only). */
    skipBrandLoad?: boolean;
    traceId: string;
  }): Promise<{
    schema_version: 1;
    valid: boolean;
    status: ContentLifecycleStatus;
    errors?: string[];
    checks?: Record<string, string>;
    traceId: string;
  }>;
  optimize(input: {
    contentItemId: string;
    traceId: string;
  }): Promise<
    | {
        schema_version: 1;
        ok: true;
        contentItemId: string;
        status: "optimized" | "ready";
        traceId: string;
      }
    | {
        schema_version: 1;
        ok: false;
        code: string;
        message: string;
        traceId: string;
      }
  >;
  repurpose(input: {
    contentItemId: string;
    projectId?: string;
    traceId: string;
  }): Promise<
    | {
        schema_version: 1;
        ok: true;
        packId: string;
        channelItemIds: Record<RepurposeChannelId, string>;
        traceId: string;
      }
    | {
        schema_version: 1;
        ok: false;
        code: string;
        message: string;
        traceId: string;
        errors?: string[];
      }
  >;
  exportPack(input: {
    projectId: string;
    contentItemIds: string[];
    exportRoot: string;
    exportDate?: string;
    packId?: string;
    traceId: string;
  }): Promise<
    | {
        schema_version: 1;
        ok: true;
        exportPath: string;
        relativePath: string;
        files: string[];
        traceId: string;
      }
    | {
        schema_version: 1;
        ok: false;
        code: string;
        message: string;
        traceId: string;
      }
  >;
  listHistory(projectId: string, limit?: number): Promise<unknown[]>;
  appendHistorySafe(input: {
    projectId: string;
    contentItemId?: string | null;
    accountId?: string | null;
    kind: unknown;
    exportPath?: string | null;
    publishMode?: "api" | "session" | null;
    externalPostId?: string | null;
    meta?: Record<string, unknown>;
  }): Promise<
    | { ok: true; id: string }
    | { ok: false; code: string; message: string }
  >;
};

function newId(): string {
  return randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

async function appendDraftHistory(
  storage: ContentStorage,
  projectId: string,
  contentItemId: string,
): Promise<void> {
  const kind = parseHistoryKind("draft");
  if (!kind.ok) return;
  await storage.content.appendHistory({
    projectId,
    contentItemId,
    accountId: null,
    kind: kind.kind,
    publishMode: null,
    exportPath: null,
    externalPostId: null,
    metaJson: JSON.stringify(withSchemaVersion({ source: "content.produce" })),
    occurredAt: nowIso(),
  });
}

/**
 * ContentEngine — C1A Produce → Validate → Optimize/Repurpose + Export backup.
 * Brand rules: call-site override OR optional `loadBrandRules` (research SoT).
 */
export function createContentEngine(
  storage: ContentStorage,
  options?: ContentEngineOptions,
): ContentEngine {
  const engine: ContentEngine = {
    async produce(input) {
      const meta = buildArtifactMeta({
        body: input.body,
        title: input.title,
        prompt: input.prompt,
        hooks: input.hooks,
        hashtags: input.hashtags,
      });
      const { id } = await storage.content.createItem({
        projectId: input.projectId,
        workflowRunId: input.workflowRunId ?? null,
        targetAccountId: input.targetAccountId ?? null,
        channel: input.channel ?? SOURCE_CHANNEL_ID,
        format: input.format ?? "text",
        status: "draft",
        artifactRef: null,
        metaJson: serializeArtifactMeta(meta),
      });
      await appendDraftHistory(storage, input.projectId, id);
      return {
        schema_version: SCHEMA_VERSION,
        contentItemId: id,
        status: "draft",
        traceId: input.traceId,
      };
    },

    async getArtifact(contentItemId) {
      const row = await storage.content.getItem(contentItemId);
      if (!row) return null;
      const meta = parseArtifactMeta(row.metaJson);
      return {
        schema_version: SCHEMA_VERSION,
        id: row.id,
        projectId: row.projectId,
        channel: row.channel,
        format: row.format,
        status: row.status,
        targetAccountId: row.targetAccountId,
        workflowRunId: row.workflowRunId,
        artifactRef: row.artifactRef,
        meta: meta.ok ? meta.meta : null,
        metaParseErrors: meta.ok ? undefined : meta.errors,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    },

    async validate(input) {
      const row = await storage.content.getItem(input.contentItemId);
      if (!row) {
        return {
          schema_version: SCHEMA_VERSION,
          valid: false,
          status: "failed_validation" as const,
          errors: ["content item not found"],
          traceId: input.traceId,
        };
      }
      let brand = input.brand;
      if (!brand && !input.skipBrandLoad && options?.loadBrandRules) {
        brand = await options.loadBrandRules(row.projectId);
      }
      const result = runValidate({
        channel: row.channel,
        metaJson: row.metaJson,
        brand,
      });
      if (result.meta) {
        await storage.content.updateItem(row.id, {
          status: result.status,
          metaJson: serializeArtifactMeta(result.meta),
        });
      } else {
        await storage.content.updateItem(row.id, {
          status: result.status,
        });
      }
      return {
        schema_version: SCHEMA_VERSION,
        valid: result.ok,
        status: result.status,
        errors: result.ok ? undefined : result.errors,
        checks: result.validation.checks,
        traceId: input.traceId,
      };
    },

    async optimize(input) {
      const row = await storage.content.getItem(input.contentItemId);
      if (!row) {
        return {
          schema_version: SCHEMA_VERSION,
          ok: false as const,
          code: CONTENT_ERROR_CODES.NOT_FOUND,
          message: "content item not found",
          traceId: input.traceId,
        };
      }
      if (!assertValidatedStatus(row.status)) {
        return {
          schema_version: SCHEMA_VERSION,
          ok: false as const,
          code: CONTENT_ERROR_CODES.VALIDATE_REQUIRED,
          message: `Optimize refused: status=${row.status} (Validate required)`,
          traceId: input.traceId,
        };
      }
      const parsed = parseArtifactMeta(row.metaJson);
      if (!parsed.ok) {
        return {
          schema_version: SCHEMA_VERSION,
          ok: false as const,
          code: CONTENT_ERROR_CODES.INVALID_ARTIFACT,
          message: parsed.errors.join("; "),
          traceId: input.traceId,
        };
      }
      const meta = parsed.meta;
      const hooks =
        meta.hooks && meta.hooks.length > 0
          ? meta.hooks
          : [meta.body.split(/[.!?\n]/)[0]?.trim() || meta.title || "Hook"].slice(0, 1);
      const hashtags =
        meta.hashtags && meta.hashtags.length > 0
          ? meta.hashtags
          : ["CLIME", "GrowthStudio"];
      const title = meta.title ?? hooks[0] ?? "Optimized";
      const next = buildArtifactMeta({
        body: meta.body.trim(),
        title,
        prompt: meta.prompt,
        hooks,
        hashtags,
        sourceContentItemId: meta.sourceContentItemId,
        packId: meta.packId,
        validation: meta.validation,
      });
      const status: ContentLifecycleStatus =
        next.body.length >= 40 ? "ready" : "optimized";
      contentLifecycleStatusSchema.parse(status);
      await storage.content.updateItem(row.id, {
        status,
        metaJson: serializeArtifactMeta(next),
      });
      return {
        schema_version: SCHEMA_VERSION,
        ok: true as const,
        contentItemId: row.id,
        status,
        traceId: input.traceId,
      };
    },

    async repurpose(input) {
      const source = await storage.content.getItem(input.contentItemId);
      if (!source) {
        return {
          schema_version: SCHEMA_VERSION,
          ok: false as const,
          code: CONTENT_ERROR_CODES.NOT_FOUND,
          message: "source content item not found",
          traceId: input.traceId,
        };
      }
      if (!assertValidatedStatus(source.status)) {
        return {
          schema_version: SCHEMA_VERSION,
          ok: false as const,
          code: CONTENT_ERROR_CODES.VALIDATE_REQUIRED,
          message: `Repurpose refused: status=${source.status} (Validate required)`,
          traceId: input.traceId,
        };
      }
      const parsed = parseArtifactMeta(source.metaJson);
      if (!parsed.ok) {
        return {
          schema_version: SCHEMA_VERSION,
          ok: false as const,
          code: CONTENT_ERROR_CODES.INVALID_ARTIFACT,
          message: parsed.errors.join("; "),
          traceId: input.traceId,
        };
      }

      const packId = newId();
      const projectId = input.projectId ?? source.projectId;
      const channelItemIds = {} as Record<RepurposeChannelId, string>;
      const errors: string[] = [];

      for (const tpl of listChannelTemplates()) {
        const body = tpl.render({
          title: parsed.meta.title,
          body: parsed.meta.body,
        });
        const childMeta = buildArtifactMeta({
          body,
          title: parsed.meta.title,
          prompt: parsed.meta.prompt,
          hashtags: parsed.meta.hashtags,
          sourceContentItemId: source.id,
          packId,
        });
        const { id: childId } = await storage.content.createItem({
          projectId,
          workflowRunId: source.workflowRunId,
          targetAccountId: source.targetAccountId,
          channel: tpl.id,
          format: tpl.format,
          status: "draft",
          artifactRef: null,
          metaJson: serializeArtifactMeta(childMeta),
        });
        await appendDraftHistory(storage, projectId, childId);

        const validated = await engine.validate({
          contentItemId: childId,
          traceId: input.traceId,
        });
        if (!validated.valid) {
          errors.push(
            `${tpl.id}: ${(validated.errors ?? ["validation failed"]).join(", ")}`,
          );
        } else {
          channelItemIds[tpl.id] = childId;
        }
      }

      if (errors.length > 0 || Object.keys(channelItemIds).length !== REPURPOSE_CHANNEL_IDS.length) {
        return {
          schema_version: SCHEMA_VERSION,
          ok: false as const,
          code: CONTENT_ERROR_CODES.VALIDATION_FAILED,
          message: "7-channel repurpose incomplete — Validate failed on one or more channels",
          traceId: input.traceId,
          errors,
        };
      }

      // Ensure all 7 keys present
      for (const id of REPURPOSE_CHANNEL_IDS) {
        if (!channelItemIds[id]) {
          return {
            schema_version: SCHEMA_VERSION,
            ok: false as const,
            code: CONTENT_ERROR_CODES.VALIDATION_FAILED,
            message: `Missing channel artifact: ${id}`,
            traceId: input.traceId,
          };
        }
      }

      return {
        schema_version: SCHEMA_VERSION,
        ok: true as const,
        packId,
        channelItemIds,
        traceId: input.traceId,
      };
    },

    async exportPack(input) {
      const items = [];
      for (const id of input.contentItemIds) {
        const row = await storage.content.getItem(id);
        if (!row) {
          return {
            schema_version: SCHEMA_VERSION,
            ok: false as const,
            code: CONTENT_ERROR_CODES.NOT_FOUND,
            message: `content item not found: ${id}`,
            traceId: input.traceId,
          };
        }
        items.push({
          contentItemId: row.id,
          channel: row.channel,
          targetAccountId: row.targetAccountId,
          metaJson: row.metaJson,
        });
      }

      const written = writeExportBackupPack({
        projectId: input.projectId,
        items,
        exportRoot: input.exportRoot,
        exportDate: input.exportDate,
        packId: input.packId,
      });
      if (!written.ok) {
        return {
          schema_version: SCHEMA_VERSION,
          ok: false as const,
          code: written.code,
          message: written.message,
          traceId: input.traceId,
        };
      }

      const kind = parseHistoryKind("export");
      if (!kind.ok) {
        return {
          schema_version: SCHEMA_VERSION,
          ok: false as const,
          code: kind.code,
          message: kind.message,
          traceId: input.traceId,
        };
      }

      for (const item of items) {
        await storage.content.appendHistory({
          projectId: input.projectId,
          contentItemId: item.contentItemId,
          accountId: item.targetAccountId,
          kind: kind.kind,
          publishMode: null,
          exportPath: written.relativePath,
          externalPostId: null,
          metaJson: JSON.stringify(
            withSchemaVersion({
              backup: true,
              files: written.files,
              manifestKind: written.manifest.kind,
            }),
          ),
          occurredAt: nowIso(),
        });
      }

      return {
        schema_version: SCHEMA_VERSION,
        ok: true as const,
        exportPath: written.exportPath,
        relativePath: written.relativePath,
        files: written.files,
        traceId: input.traceId,
      };
    },

    async listHistory(projectId, limit = 50) {
      return storage.content.listHistory(projectId, limit);
    },

    async appendHistorySafe(input) {
      const kind = parseHistoryKind(input.kind);
      if (!kind.ok) {
        return { ok: false, code: kind.code, message: kind.message };
      }
      const { id } = await storage.content.appendHistory({
        projectId: input.projectId,
        contentItemId: input.contentItemId ?? null,
        accountId: input.accountId ?? null,
        kind: kind.kind,
        publishMode: input.publishMode ?? null,
        exportPath: input.exportPath ?? null,
        externalPostId: input.externalPostId ?? null,
        metaJson: JSON.stringify(withSchemaVersion(input.meta ?? {})),
        occurredAt: nowIso(),
      });
      return { ok: true, id };
    },
  };
  return engine;
}

export { CHANNEL_TEMPLATES, REPURPOSE_CHANNEL_IDS, SOURCE_CHANNEL_ID };
