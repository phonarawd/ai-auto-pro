import {
  exposeDomainClientInPreload,
  type ContextBridgeLike,
  type IpcRendererLike,
} from "@clime/domain-api";

/** Global key exposed to renderer via contextBridge. */
export const DOMAIN_CLIENT_GLOBAL = "domainClient" as const;

/**
 * Preload entry — exposes typed DomainClient only.
 *
 * Forbidden: raw ipcRenderer, Node APIs, Command/Query/Domain/System bus subscribe.
 * Progress/events flow through NotificationAPI (Domain API), not UI bus subscriptions.
 */
export function setupDesktopPreload(
  contextBridge: ContextBridgeLike,
  ipcRenderer: IpcRendererLike,
) {
  return exposeDomainClientInPreload(contextBridge, ipcRenderer, DOMAIN_CLIENT_GLOBAL);
}
