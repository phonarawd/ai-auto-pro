import type { RevenueEngine } from "./engine.js";
import { revenueCandidateSchema } from "./schemas.js";

type ArgRecord = Record<string, unknown>;

type DomainHandler = (
  args: ArgRecord,
  context: {
    requestId: string;
    traceId: string;
    projectId?: string | null;
  },
) => Promise<unknown>;

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function parseCandidates(value: unknown) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const item of value) {
    const parsed = revenueCandidateSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

/**
 * Growth revenue handlers — EA §5.
 */
export function createRevenueDomainHandlers(
  engine: RevenueEngine,
  options?: { defaultProjectId?: string },
): Record<string, DomainHandler> {
  const defaultProjectId = options?.defaultProjectId;

  const resolveProjectId = (args: ArgRecord, ctx: { projectId?: string | null }) =>
    asString(args.projectId, ctx.projectId ?? defaultProjectId ?? "");

  return {
    "growth.estimateRevenue": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      const candidates = parseCandidates(args.candidates);
      if (!projectId) {
        return {
          schema_version: 1,
          estimates: [],
          isEstimate: true,
          estimateLabel: "추정",
          errors: ["projectId required"],
        };
      }
      return engine.estimateRevenue({ projectId, candidates });
    },

    "growth.prioritizeRevenue": async (args, ctx) => {
      const projectId = resolveProjectId(args, ctx);
      const candidates = parseCandidates(args.candidates);
      if (!projectId) {
        return {
          schema_version: 1,
          kind: "growth.revenue_prioritizer_result",
          projectId: "",
          ranked: [],
          isEstimate: true,
          estimateLabel: "추정",
          rankedAt: new Date().toISOString(),
          errors: ["projectId required"],
        };
      }
      return engine.prioritizeRevenue({ projectId, candidates });
    },
  };
}
