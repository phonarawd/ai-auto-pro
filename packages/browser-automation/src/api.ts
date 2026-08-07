import { generateJobId } from "./job-id.js";
import type { PublishLadder } from "./ladder.js";

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

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Domain handlers for publish ladder — C2A §2.3.
 * Registered as `account.publish` at desktop host (account package must not depend on BAE).
 *
 * Kind [A] host requires `jobId` on the result object; ladder fields are returned alongside.
 */
export function createPublishDomainHandlers(
  ladder: PublishLadder,
  options?: {
    generateJobId?: () => string;
    /** When true, ack immediately and run publish without awaiting (background). */
    fireAndForget?: boolean;
  },
): Record<string, DomainHandler> {
  const jobId = options?.generateJobId ?? generateJobId;
  const fireAndForget = options?.fireAndForget ?? false;

  return {
    "account.publish": async (args, ctx) => {
      const projectId = asString(args.projectId, ctx.projectId ?? "");
      const contentItemId = asString(args.contentItemId);
      const accountId = asString(args.accountId);
      const id = jobId();

      if (!projectId || !contentItemId || !accountId) {
        return {
          schema_version: 1 as const,
          jobId: id,
          ok: false as const,
          code: "PUBLISH_FAILED",
          message: "projectId, contentItemId, and accountId are required",
          traceId: ctx.traceId,
        };
      }

      const input = {
        projectId,
        contentItemId,
        accountId,
        platform: asOptionalString(args.platform),
        traceId: ctx.traceId,
        skipJitter: args.skipJitter === true,
      };

      if (fireAndForget) {
        void ladder.publish(input);
        return {
          schema_version: 1 as const,
          jobId: id,
          traceId: ctx.traceId,
        };
      }

      const result = await ladder.publish(input);
      return {
        ...result,
        jobId: id,
      };
    },
  };
}
