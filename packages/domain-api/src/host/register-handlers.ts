import { buildDomainChannel } from "../ipc/channel.js";
import { NAMESPACE_METHOD_METADATA } from "../namespaces/index.js";
import type { DomainHost } from "./create-host.js";

export interface IpcMainLike {
  handle(
    channel: string,
    listener: (event: unknown, ...args: unknown[]) => Promise<unknown>,
  ): void;
  removeHandler?(channel: string): void;
}

/**
 * Registers all 14 namespace Domain API channels on Electron ipcMain.
 * Channel format is exclusively `domain:<namespace>.<method>`.
 */
export function registerDomainIpcHandlers(ipcMain: IpcMainLike, host: DomainHost): void {
  for (const [ns, methods] of Object.entries(NAMESPACE_METHOD_METADATA)) {
    for (const method of Object.keys(methods)) {
      const channel = buildDomainChannel(ns, method);
      ipcMain.handle(channel, async (_event, rawRequest) => {
        return host.handleIpcRequest(channel, rawRequest);
      });
    }
  }
}

/**
 * Removes all Domain API channel handlers from Electron ipcMain.
 */
export function unregisterDomainIpcHandlers(ipcMain: IpcMainLike): void {
  if (!ipcMain.removeHandler) return;
  for (const [ns, methods] of Object.entries(NAMESPACE_METHOD_METADATA)) {
    for (const method of Object.keys(methods)) {
      const channel = buildDomainChannel(ns, method);
      ipcMain.removeHandler(channel);
    }
  }
}
