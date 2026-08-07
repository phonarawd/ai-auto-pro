import { z } from "zod";
import { SCHEMA_VERSION } from "@clime/shared";

/** Browser / tool profile — FS/OCR home only; Playwright lives in browser-automation. */
export const browserProfileSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION).default(SCHEMA_VERSION),
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(["browser", "fs", "ocr"]).default("browser"),
  userDataHint: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type BrowserProfile = z.infer<typeof browserProfileSchema>;
