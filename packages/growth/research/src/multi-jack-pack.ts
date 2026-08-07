import type { MultiJackContentHook } from "./schemas.js";
import {
  MULTI_JACK_FORMAT_IDS,
  multiJackVariantPackSchema,
  type MultiJackVariant,
  type MultiJackVariantPack,
} from "./viral-schemas.js";

/**
 * vg-c / vg-a §2 — hot topic → meme / card-news / Shorts / Threads pack.
 * Deterministic free_local path (Ollama/paid adapters not required for V1 prove).
 */
export function buildMultiJackVariantPack(input: {
  projectId: string;
  hook: MultiJackContentHook;
  personaHints?: string[];
  now?: string;
}): MultiJackVariantPack {
  if (input.hook.paidApiRequired !== false) {
    throw new Error("Multi-Jack pack requires paidApiRequired=false");
  }

  const persona =
    input.personaHints ??
    input.hook.personaHints ??
    ["growth_operator"];
  const topic = input.hook.hotTopic;
  const tips = input.hook.formatTips.slice(0, 3).join(" · ") || "hook → proof → CTA";
  const kw = input.hook.keywords.slice(0, 5).join(", ") || topic;
  const createdAt = input.now ?? new Date().toISOString();

  const variants: MultiJackVariant[] = [
    {
      format: "meme",
      title: `${topic} — meme frame`,
      body: [
        `TOP: When ${topic} hits your feed`,
        `BOTTOM: CLIME-fit move — ${tips}`,
        `ALT: Keywords ${kw}`,
        `Persona: ${persona.join(", ")}`,
      ].join("\n"),
      personaApplied: persona,
    },
    {
      format: "card_news",
      title: `${topic} — card news (4 cuts)`,
      body: [
        `1/ Hook: ${topic}`,
        `2/ Why now: score ${input.hook.unifiedScore.toFixed(2)} · CLIME-fit ${input.hook.climeFit.toFixed(2)}`,
        `3/ Play: ${tips}`,
        `4/ CTA: Save this pack · Validate before publish`,
      ].join("\n"),
      personaApplied: persona,
    },
    {
      format: "shorts",
      title: `${topic} — Shorts script (~30s)`,
      body: [
        `0–3s: ${topic}?`,
        `3–12s: Gap — ${kw}`,
        `12–22s: Move — ${tips}`,
        `22–30s: CTA — Mission Center START → Queue (no bypass)`,
        `Budget: free_local · paidApiRequired=false`,
      ].join("\n"),
      personaApplied: persona,
    },
    {
      format: "threads",
      title: `${topic} — Threads post`,
      body: [
        `${topic}`,
        "",
        `Why it fits CLIME: fit ${input.hook.climeFit.toFixed(2)}`,
        `Formats: ${tips}`,
        `Keywords: ${kw}`,
        "",
        `— for ${persona.join(" / ")}`,
        "Validate before publish. Export backup ≠ .clime playbook.",
      ].join("\n"),
      personaApplied: persona,
    },
  ];

  const formats = new Set(variants.map((v) => v.format));
  for (const id of MULTI_JACK_FORMAT_IDS) {
    if (!formats.has(id)) {
      throw new Error(`Multi-Jack pack missing required format: ${id}`);
    }
  }

  return multiJackVariantPackSchema.parse({
    schema_version: 1,
    kind: "growth.multi_jack_variant_pack",
    id: `mjpack_${input.hook.trendId}_${createdAt.slice(0, 10)}`,
    projectId: input.projectId,
    trendId: input.hook.trendId,
    hotTopic: topic,
    createdAt,
    hook: input.hook,
    variants,
    budgetClass: "free_local",
    paidApiRequired: false,
  });
}
