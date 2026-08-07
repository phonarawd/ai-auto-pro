import { SCHEMA_VERSION } from "@clime/shared";
import {
  contentArtifactMetaSchema,
  type ContentArtifactMeta,
} from "./schemas.js";

export function parseArtifactMeta(
  metaJson: string,
):
  | { ok: true; meta: ContentArtifactMeta }
  | { ok: false; errors: string[] } {
  let raw: unknown;
  try {
    raw = JSON.parse(metaJson) as unknown;
  } catch {
    return { ok: false, errors: ["metaJson is not valid JSON"] };
  }
  const parsed = contentArtifactMetaSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => i.message),
    };
  }
  return { ok: true, meta: parsed.data };
}

export function serializeArtifactMeta(meta: ContentArtifactMeta): string {
  const checked = contentArtifactMetaSchema.parse(meta);
  return JSON.stringify(checked);
}

export function buildArtifactMeta(input: {
  body: string;
  title?: string;
  prompt?: string;
  hooks?: string[];
  hashtags?: string[];
  sourceContentItemId?: string;
  packId?: string;
  validation?: ContentArtifactMeta["validation"];
}): ContentArtifactMeta {
  return contentArtifactMetaSchema.parse({
    schema_version: SCHEMA_VERSION,
    kind: "content.artifact" as const,
    body: input.body,
    title: input.title,
    prompt: input.prompt,
    hooks: input.hooks,
    hashtags: input.hashtags,
    sourceContentItemId: input.sourceContentItemId,
    packId: input.packId,
    validation: input.validation,
  });
}
