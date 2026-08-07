import { contextBridge, ipcRenderer } from "electron";
import { setupDesktopPreload } from "./setup-preload.js";

/**
 * Electron Preload Entrypoint
 * Securely exposes window.domainClient using contextBridge.
 * Raw ipcRenderer and Node internals are NOT exposed.
 */
setupDesktopPreload(contextBridge, ipcRenderer);
