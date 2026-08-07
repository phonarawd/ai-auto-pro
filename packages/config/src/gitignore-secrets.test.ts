import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/** Repo root from packages/config — keep .gitignore secret blocks intact (S4A §5). */
const GITIGNORE = resolve(import.meta.dirname, "../../../.gitignore");

describe(".gitignore secret blocking", () => {
  it("keeps env / vault / secrets / key material ignored", () => {
    const text = readFileSync(GITIGNORE, "utf8");
    const required = [
      ".env",
      ".env.*",
      "!.env.example",
      "*.pem",
      "*.key",
      "secrets/",
      ".vault/",
    ];
    for (const entry of required) {
      expect(text, `missing gitignore entry: ${entry}`).toContain(entry);
    }
  });
});
