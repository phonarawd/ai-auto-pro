import { randomBytes } from "node:crypto";

/** URL-safe id fragment for VaultRef. */
export function newVaultId(): string {
  return randomBytes(16).toString("base64url");
}

export function toVaultRef(id: string): `vault:${string}` {
  return `vault:${id}`;
}

export function vaultRefToId(ref: string): string {
  return ref.slice("vault:".length);
}
