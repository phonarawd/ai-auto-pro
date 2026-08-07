import { SCHEMA_VERSION } from "@clime/shared";
import { createTraceId } from "@clime/observability";
import { buildDomainChannel } from "../ipc/channel.js";
import type { DomainIpcRequest, DomainIpcResponse } from "../ipc/envelope.js";
import { DomainApiError } from "../ipc/errors.js";
import type { DomainClient, DomainClientCallMeta } from "../namespaces/types.js";
import { NAMESPACE_METHOD_METADATA } from "../namespaces/types.js";

export type DomainIpcInvoker = (
  channel: string,
  request: DomainIpcRequest,
) => Promise<DomainIpcResponse>;

export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Creates preload-safe DomainClient instance wrapping an IPC invoker function.
 */
export function createDomainClient(invoker: DomainIpcInvoker): DomainClient {
  const clientObj: Record<
    string,
    Record<string, (args?: Record<string, unknown>, meta?: DomainClientCallMeta) => Promise<unknown>>
  > = {};

  for (const [ns, methods] of Object.entries(NAMESPACE_METHOD_METADATA)) {
    clientObj[ns] = {};
    for (const methodName of Object.keys(methods)) {
      clientObj[ns]![methodName] = async (args: Record<string, unknown> = {}, meta?: DomainClientCallMeta) => {
        const channel = buildDomainChannel(ns, methodName);
        const traceId = meta?.traceId ?? createTraceId();
        const requestId = meta?.requestId ?? generateRequestId();

        const requestEnvelope: DomainIpcRequest = {
          requestId,
          schema_version: SCHEMA_VERSION,
          traceId,
          projectId: meta?.projectId,
          args: args ?? {},
        };

        const response: DomainIpcResponse = await invoker(channel, requestEnvelope);

        if (!response.ok) {
          throw new DomainApiError(response.error);
        }

        return response.data;
      };
    }
  }

  const client = clientObj as unknown as DomainClient;
  // Default no-op; preload bridge replaces with allowlisted `domain:notification.push` subscribe.
  client.notification.subscribePush = () => () => undefined;
  return client;
}
