import { withSchemaVersionSchema } from "@clime/shared";
import { z } from "zod";
import { multiJackContentHookSchema } from "./schemas.js";

/** vg-a badge §3.3 — referral / Powered-by surface. */
export const referralPlacedOnSchema = z.enum([
  "micro_audit_export",
  "clime_playbook_share",
  "other_viral",
]);
export type ReferralPlacedOn = z.infer<typeof referralPlacedOnSchema>;

export const climeReferralBadgeSchema = withSchemaVersionSchema({
  kind: z.literal("clime.referral_badge"),
  wordmark: z.literal("Powered by CLIME Growth OS"),
  referralCode: z.string().min(1),
  referralUrl: z
    .string()
    .min(1)
    .refine((u) => /^https:\/\/[^\s]+$/i.test(u), "referralUrl must be https URL"),
  locale: z.string().optional(),
  placedOn: referralPlacedOnSchema,
});
export type ClimeReferralBadge = z.infer<typeof climeReferralBadgeSchema>;

/** vg-b viral export manifest — not content.export_backup. */
export const microAuditViralExportManifestSchema = withSchemaVersionSchema({
  kind: z.literal("growth.micro_audit_viral_export"),
  projectId: z.string().min(1),
  auditId: z.string().min(1),
  exportDate: z.string().min(1),
  createdAt: z.string().min(1),
  relativePath: z.string().min(1),
  files: z.array(z.string()),
  pdfPath: z.string().min(1),
  infographicPath: z.string().min(1),
  referralBadge: climeReferralBadgeSchema,
  paidApiRequired: z.literal(false),
  /** Explicit separation from Export backup packs. */
  isExportBackup: z.literal(false),
});
export type MicroAuditViralExportManifest = z.infer<
  typeof microAuditViralExportManifestSchema
>;

/** vg-c Multi-Jack format set (minimum frozen). */
export const multiJackFormatIdSchema = z.enum([
  "meme",
  "card_news",
  "shorts",
  "threads",
]);
export type MultiJackFormatId = z.infer<typeof multiJackFormatIdSchema>;

export const multiJackVariantSchema = z.object({
  format: multiJackFormatIdSchema,
  title: z.string().min(1),
  body: z.string().min(1),
  personaApplied: z.array(z.string()).optional(),
});
export type MultiJackVariant = z.infer<typeof multiJackVariantSchema>;

export const multiJackVariantPackSchema = withSchemaVersionSchema({
  kind: z.literal("growth.multi_jack_variant_pack"),
  id: z.string().min(1),
  projectId: z.string().min(1),
  trendId: z.string().min(1),
  hotTopic: z.string().min(1),
  createdAt: z.string().min(1),
  hook: multiJackContentHookSchema,
  variants: z.array(multiJackVariantSchema).min(4),
  budgetClass: z.literal("free_local"),
  paidApiRequired: z.literal(false),
});
export type MultiJackVariantPack = z.infer<typeof multiJackVariantPackSchema>;

export const MULTI_JACK_FORMAT_IDS = [
  "meme",
  "card_news",
  "shorts",
  "threads",
] as const satisfies readonly MultiJackFormatId[];
