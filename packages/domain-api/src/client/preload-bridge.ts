import { DOMAIN_CHANNEL_PREFIX } from "../ipc/channel.js";
import type { DomainIpcRequest, DomainIpcResponse } from "../ipc/envelope.js";
import type { DomainClient, InboxItemView } from "../namespaces/types.js";
import { createDomainClient } from "./create-domain-client.js";

/** Allowlisted push channel for NotificationAPI — not a raw event bus subscription. */
export const NOTIFICATION_PUSH_CHANNEL = "domain:notification.push" as const;

export interface IpcRendererLike {
  invoke(channel: string, request: DomainIpcRequest): Promise<DomainIpcResponse>;
  on?(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void;
  removeListener?(channel: string, listener: (...args: unknown[]) => void): void;
}

export interface ContextBridgeLike {
  exposeInMainWorld(apiKey: string, api: unknown): void;
}

/**
 * Creates DomainClient for Electron preload script, strictly restricting
 * IPC channels to `domain:*` prefix, plus allowlisted notification push subscribe.
 */
export function createPreloadDomainClient(ipcRenderer: IpcRendererLike): DomainClient {
  const client = createDomainClient(async (channel, request) => {
    if (!channel.startsWith(DOMAIN_CHANNEL_PREFIX)) {
      throw new Error(`Security Exception: Channel '${channel}' is not in Domain API allowlist.`);
    }
    return ipcRenderer.invoke(channel, request);
  });

  client.notification.subscribePush = (callback: (item: InboxItemView) => void) => {
    if (typeof ipcRenderer.on !== "function" || typeof ipcRenderer.removeListener !== "function") {
      return () => undefined;
    }

    const listener = (_event: unknown, ...args: unknown[]) => {
      const item = args[0] as InboxItemView;
      if (item && typeof item === "object" && typeof item.id === "string") {
        callback(item);
      }
    };

    ipcRenderer.on(NOTIFICATION_PUSH_CHANNEL, listener);
    return () => {
      ipcRenderer.removeListener?.(NOTIFICATION_PUSH_CHANNEL, listener);
    };
  };

  return client;
}

/**
 * Exposes typed DomainClient to renderer process via Electron contextBridge.
 * Strictly exposes ONLY the DomainClient methods — no raw ipcRenderer or Node.js APIs.
 */
export function exposeDomainClientInPreload(
  contextBridge: ContextBridgeLike,
  ipcRenderer: IpcRendererLike,
  bridgeName: string = "domainClient",
): DomainClient {
  const client = createPreloadDomainClient(ipcRenderer);
  contextBridge.exposeInMainWorld(bridgeName, client);
  return client;
}
