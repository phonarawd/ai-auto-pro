import type { Observability } from "@clime/observability";
import type { GovernanceAPI, GovernanceDenyCode } from "@clime/feature-management";
import { parseDomainChannel } from "../ipc/channel.js";
import { domainIpcRequestSchema, type DomainIpcRequest, type DomainIpcResponse } from "../ipc/envelope.js";
import { createDomainError, toDomainError, type DomainErrorCode } from "../ipc/errors.js";
import { createAsyncJobAck, generateJobId } from "../ipc/job-id.js";
import { createDefaultDomainHandlers, NAMESPACE_METHOD_METADATA } from "../namespaces/index.js";
import { createGovernanceDomainHandlers, isFullGovernanceAPI } from "./governance-handlers.js";

export type DomainApiHandler = (
  args: Record<string, unknown>,
  context: {
    requestId: string;
    traceId: string;
    projectId?: string | null;
  },
) => Promise<unknown>;

export interface DomainHostDeps {
  /**
   * Governance surface:
   * - `admit` only — gate Commands / Async Commands
   * - full `GovernanceAPI` — also replaces `governance.*` stubs with S25A wrappers
   */
  governanceAPI?: Pick<GovernanceAPI, "admit"> | GovernanceAPI;
  observability?: Observability;
  handlers?: Record<string, DomainApiHandler>;
}

export interface DomainHost {
  handleIpcRequest(channel: string, rawRequest: unknown): Promise<DomainIpcResponse>;
  registerHandler(channel: string, handler: DomainApiHandler): void;
}

function mapGovernanceDenyCode(denyCode?: GovernanceDenyCode): DomainErrorCode {
  switch (denyCode) {
    case "KILL_SWITCH":
      return "KILL_SWITCH";
    case "FEATURE_DISABLED":
      return "FEATURE_DISABLED";
    case "POLICY_DENIED":
      return "POLICY_DENIED";
    case "CAPABILITY_DENIED":
      return "CAPABILITY_DENIED";
    case "GOVERNOR_THROTTLED":
      return "GOVERNOR_THROTTLED";
    default:
      return "POLICY_DENIED";
  }
}

function toChannelKey(key: string): string {
  return key.startsWith("domain:") ? key : `domain:${key}`;
}

function normalizeHandlerMap(
  handlers: Record<string, DomainApiHandler>,
): Record<string, DomainApiHandler> {
  const normalized: Record<string, DomainApiHandler> = {};
  for (const [key, handler] of Object.entries(handlers)) {
    normalized[toChannelKey(key)] = handler;
  }
  return normalized;
}

export function createDomainHost(deps?: DomainHostDeps): DomainHost {
  const governanceHandlers =
    deps?.governanceAPI && isFullGovernanceAPI(deps.governanceAPI)
      ? createGovernanceDomainHandlers(deps.governanceAPI)
      : {};

  const handlerMap = normalizeHandlerMap({
    ...createDefaultDomainHandlers(),
    ...governanceHandlers,
    ...(deps?.handlers ?? {}),
  });

  return {
    registerHandler(channel: string, handler: DomainApiHandler) {
      handlerMap[toChannelKey(channel)] = handler;
    },

    async handleIpcRequest(channel: string, rawRequest: unknown): Promise<DomainIpcResponse> {
      let reqTraceId = "trace_unknown";
      let reqId = "req_unknown";

      try {
        // 1. Validate envelope
        const parsedReq = domainIpcRequestSchema.safeParse(rawRequest);
        if (!parsedReq.success) {
          const firstTraceId =
            rawRequest && typeof rawRequest === "object" && "traceId" in rawRequest && typeof rawRequest.traceId === "string"
              ? rawRequest.traceId
              : "trace_validation_failed";
          const firstReqId =
            rawRequest && typeof rawRequest === "object" && "requestId" in rawRequest && typeof rawRequest.requestId === "string"
              ? rawRequest.requestId
              : "req_validation_failed";

          return {
            requestId: firstReqId,
            ok: false,
            traceId: firstTraceId,
            error: createDomainError("VALIDATION_FAILED", "Invalid IPC request envelope", firstTraceId, {
              details: { fieldErrors: parsedReq.error.flatten().fieldErrors },
            }),
          };
        }

        const req: DomainIpcRequest = parsedReq.data;
        reqTraceId = req.traceId;
        reqId = req.requestId;

        // 2. Parse channel
        const channelParts = parseDomainChannel(channel);
        if (!channelParts) {
          return {
            requestId: reqId,
            ok: false,
            traceId: reqTraceId,
            error: createDomainError("NOT_FOUND", `Invalid channel format '${channel}'`, reqTraceId),
          };
        }

        const { namespace, method } = channelParts;
        const meta = NAMESPACE_METHOD_METADATA[namespace]?.[method];

        // 3. Resolve handler
        const handler = handlerMap[channel];
        if (!handler) {
          return {
            requestId: reqId,
            ok: false,
            traceId: reqTraceId,
            error: createDomainError("NOT_FOUND", `No handler registered for channel '${channel}'`, reqTraceId),
          };
        }

        // 4. Governance admit for Commands/Async Commands
        if (meta && (meta.kind === "C" || meta.kind === "A") && deps?.governanceAPI) {
          const admitResult = await deps.governanceAPI.admit({
            featureKey: meta.featureKey,
            traceId: reqTraceId,
            projectId: req.projectId,
          });

          if (!admitResult.ok) {
            const code = mapGovernanceDenyCode(admitResult.code);
            return {
              requestId: reqId,
              ok: false,
              traceId: reqTraceId,
              error: createDomainError(
                code,
                admitResult.message ?? `Action denied by governance (${code})`,
                reqTraceId,
              ),
            };
          }
        }

        // 5. Execute handler
        const handlerContext = {
          requestId: reqId,
          traceId: reqTraceId,
          projectId: req.projectId,
        };

        let result = await handler(req.args, handlerContext);

        // 6. Ensure Async Command [A] returns AsyncJobAck
        if (meta && meta.kind === "A") {
          if (!result || typeof result !== "object" || !("jobId" in result)) {
            result = createAsyncJobAck(generateJobId(), reqTraceId);
          }
        }

        // 7. Record observability
        if (deps?.observability) {
          deps.observability.record({
            traceId: reqTraceId,
            channel,
            requestId: reqId,
            ok: true,
          });
        }

        return {
          requestId: reqId,
          ok: true,
          traceId: reqTraceId,
          data: result,
        };
      } catch (err) {
        const domainErr = toDomainError(err, reqTraceId);

        if (deps?.observability) {
          deps.observability.record({
            traceId: reqTraceId,
            channel,
            requestId: reqId,
            ok: false,
            errorCode: domainErr.code,
          });
        }

        return {
          requestId: reqId,
          ok: false,
          traceId: reqTraceId,
          error: domainErr,
        };
      }
    },
  };
}
