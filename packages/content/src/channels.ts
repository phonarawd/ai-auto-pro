/**
 * Canonical 7-channel Repurposer ids — C1A §6 / vg-a §3 (frozen).
 */

export const REPURPOSE_CHANNEL_IDS = [
  "x_thread",
  "instagram",
  "tiktok",
  "threads",
  "linkedin",
  "youtube_shorts",
  "blog",
] as const;

export type RepurposeChannelId = (typeof REPURPOSE_CHANNEL_IDS)[number];

export const SOURCE_CHANNEL_ID = "source" as const;

export type ChannelTemplate = {
  id: RepurposeChannelId;
  format: string;
  /** Max recommended body length (chars); soft template constraint. */
  maxBodyLength: number;
  /** Filename under Exports/YYYY-MM-DD/ */
  exportFileName: string;
  /** Transform source body → channel body (deterministic V1). */
  render: (source: { title?: string; body: string }) => string;
};

function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export const CHANNEL_TEMPLATES: Record<RepurposeChannelId, ChannelTemplate> = {
  x_thread: {
    id: "x_thread",
    format: "thread",
    maxBodyLength: 2800,
    exportFileName: "X.txt",
    render: ({ title, body }) => {
      const parts = body
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean);
      const tweets =
        parts.length > 0 ? parts : [body.trim()].filter(Boolean);
      const lines: string[] = [];
      if (title) {
        lines.push(clamp(`1/ ${title}`, 280));
      }
      for (const t of tweets) {
        const n = lines.length + 1;
        lines.push(clamp(`${n}/ ${t}`, 280));
      }
      if (lines.length === 0) {
        lines.push("1/ (empty)");
      }
      return clamp(lines.join("\n\n"), 2800);
    },
  },
  instagram: {
    id: "instagram",
    format: "caption",
    maxBodyLength: 2200,
    exportFileName: "Instagram.txt",
    render: ({ title, body }) =>
      clamp(
        [title, body.trim(), "", "#CLIME #GrowthStudio"]
          .filter(Boolean)
          .join("\n\n"),
        2200,
      ),
  },
  tiktok: {
    id: "tiktok",
    format: "script",
    maxBodyLength: 1500,
    exportFileName: "TikTok.txt",
    render: ({ title, body }) =>
      clamp(
        [
          "HOOK:",
          title ?? body.split(/[.!?]/)[0]?.trim() ?? body.slice(0, 80),
          "",
          "SCRIPT:",
          body.trim(),
          "",
          "CTA: Follow for more growth ops.",
        ].join("\n"),
        1500,
      ),
  },
  threads: {
    id: "threads",
    format: "text",
    maxBodyLength: 500,
    exportFileName: "Threads.txt",
    render: ({ title, body }) =>
      clamp([title, body.trim()].filter(Boolean).join("\n\n"), 500),
  },
  linkedin: {
    id: "linkedin",
    format: "text",
    maxBodyLength: 3000,
    exportFileName: "LinkedIn.txt",
    render: ({ title, body }) =>
      clamp(
        [title ? `${title}\n` : "", body.trim(), "", "— CLIME AI Growth Studio"]
          .filter((x) => x !== undefined)
          .join("\n"),
        3000,
      ),
  },
  youtube_shorts: {
    id: "youtube_shorts",
    format: "script",
    maxBodyLength: 1200,
    exportFileName: "YouTube_Shorts.txt",
    render: ({ title, body }) =>
      clamp(
        [
          `TITLE: ${title ?? "60s growth tip"}`,
          "",
          "SHOT LIST:",
          "1. Hook (0–3s)",
          "2. Value (3–45s)",
          "3. CTA (45–60s)",
          "",
          "NARRATION:",
          body.trim(),
        ].join("\n"),
        1200,
      ),
  },
  blog: {
    id: "blog",
    format: "longform",
    maxBodyLength: 20_000,
    exportFileName: "Blog.md",
    render: ({ title, body }) =>
      clamp(
        [`# ${title ?? "Untitled"}`, "", body.trim(), ""].join("\n"),
        20_000,
      ),
  },
};

export function isRepurposeChannelId(value: string): value is RepurposeChannelId {
  return (REPURPOSE_CHANNEL_IDS as readonly string[]).includes(value);
}

export function listChannelTemplates(): ChannelTemplate[] {
  return REPURPOSE_CHANNEL_IDS.map((id) => CHANNEL_TEMPLATES[id]);
}
