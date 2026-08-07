import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CLIME_ALL_TOKENS, CLIME_COLOR_TOKENS } from "./token-names.js";
import {
  CLIME_TOKEN_HEX_ALLOWLIST,
  CLIME_TOKEN_VALUES,
  FORBIDDEN_CLICHE_HEX,
  assertTokenCoverage,
  getClimeTokensCss,
} from "./tokens.js";

const here = dirname(fileURLToPath(import.meta.url));

describe("s6-a @clime/ui tokens", () => {
  it("covers every SSOT token name from 16", () => {
    expect(() => assertTokenCoverage()).not.toThrow();
    for (const name of CLIME_ALL_TOKENS) {
      expect(CLIME_TOKEN_VALUES[name]).toBeTruthy();
    }
    expect(CLIME_COLOR_TOKENS).toHaveLength(11);
  });

  it("tokens.css declares the same --clime-* set (no extras / no drift)", () => {
    const css = readFileSync(join(here, "tokens.css"), "utf8");
    const declared = [...css.matchAll(/--clime-[a-z0-9-]+/g)].map((m) => m[0]);
    const unique = [...new Set(declared)].sort();
    const expected = [...CLIME_ALL_TOKENS].sort();
    expect(unique).toEqual(expected);
  });

  it("raw hex exists only in the allowlist (token layer)", () => {
    for (const hex of CLIME_TOKEN_HEX_ALLOWLIST) {
      expect(hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
    const values = Object.values(CLIME_TOKEN_VALUES).join("\n");
    for (const bad of FORBIDDEN_CLICHE_HEX) {
      expect(values.toLowerCase()).not.toContain(bad.toLowerCase());
    }
  });

  it("accent is teal-ink ops (not purple / indigo hue family)", () => {
    const accent = CLIME_TOKEN_VALUES["--clime-accent"].toLowerCase();
    expect(accent).toBe("#0f766e");
    expect(accent).not.toMatch(/#(?:7c3aed|8b5cf6|6366f1|a78bfa)/i);
  });

  it("font stack locks Pretendard", () => {
    expect(CLIME_TOKEN_VALUES["--clime-font-sans"]).toContain("Pretendard");
    expect(getClimeTokensCss()).toContain("--clime-bg:");
  });
});
