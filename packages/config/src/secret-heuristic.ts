import { ConfigSecretRejectedError } from "./errors.js";

const SECRETISH_KEY =
  /(secret|password|passwd|token|api[_-]?key|private[_-]?key|access[_-]?key|client[_-]?secret)/i;

const TOKEN_PREFIXES = [
  "sk-",
  "sk_",
  "xox",
  "ghp_",
  "gho_",
  "github_pat_",
  "AIza",
  "Bearer ",
  "bearer ",
];

export function assertNotPlaintextSecret(
  key: string,
  value: unknown,
): void {
  if (SECRETISH_KEY.test(key)) {
    throw new ConfigSecretRejectedError(
      `key name "${key}" looks secret-bearing; store a vault ref instead`,
    );
  }

  if (typeof value !== "string") return;

  const trimmed = value.trim();
  if (trimmed.length === 0) return;

  for (const prefix of TOKEN_PREFIXES) {
    if (trimmed.startsWith(prefix)) {
      throw new ConfigSecretRejectedError(
        `value looks like a credential prefix (${prefix.trim()})`,
      );
    }
  }

  // Long high-entropy-looking strings without spaces
  if (
    trimmed.length >= 20 &&
    !/\s/.test(trimmed) &&
    /^[A-Za-z0-9+/=_\-.]+$/.test(trimmed)
  ) {
    const hasDigit = /\d/.test(trimmed);
    const hasLetter = /[A-Za-z]/.test(trimmed);
    if (hasDigit && hasLetter) {
      throw new ConfigSecretRejectedError(
        "value looks like a high-entropy token; use kind: \"ref\"",
      );
    }
  }
}
