import type { DomainClient } from "@clime/domain-api";

declare global {
  interface Window {
    /** Typed Domain API client — preload allowlist IPC only. */
    domainClient: DomainClient;
  }
}

export {};
