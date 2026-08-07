import {
  publishingHistoryKindSchema,
  type PublishingHistoryKind,
} from "@clime/shared";
import { CONTENT_ERROR_CODES } from "./schemas.js";

export const PUBLISHING_HISTORY_KINDS = [
  "draft",
  "export",
  "scheduled",
  "posted_manual",
  "posted_api",
  "posted_session",
] as const satisfies readonly PublishingHistoryKind[];

export type { PublishingHistoryKind };

/**
 * Parse history kind at Content boundary — unknown kinds rejected (C1A §8).
 */
export function parseHistoryKind(
  kind: unknown,
):
  | { ok: true; kind: PublishingHistoryKind }
  | { ok: false; code: typeof CONTENT_ERROR_CODES.INVALID_HISTORY_KIND; message: string } {
  const parsed = publishingHistoryKindSchema.safeParse(kind);
  if (!parsed.success) {
    return {
      ok: false,
      code: CONTENT_ERROR_CODES.INVALID_HISTORY_KIND,
      message: `Invalid PublishingHistoryEvent.kind: ${String(kind)}`,
    };
  }
  return { ok: true, kind: parsed.data };
}

/** C1 writers: only draft + export on happy path. */
export function isC1WritableHistoryKind(
  kind: PublishingHistoryKind,
): kind is "draft" | "export" {
  return kind === "draft" || kind === "export";
}
