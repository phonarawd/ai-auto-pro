import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as ui from "./index.js";
import { CLIME_ALL_TOKENS } from "./tokens/token-names.js";
import {
  CLIME_TOKEN_VALUES,
  FORBIDDEN_CLICHE_HEX,
} from "./tokens/tokens.js";

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, "..");
const srcRoot = join(pkgRoot, "src");

const TOKEN_DEF_FILES = new Set([
  join(srcRoot, "tokens", "tokens.ts"),
  join(srcRoot, "tokens", "tokens.css"),
  join(srcRoot, "tokens", "tokens.test.ts"),
]);

const HEX_RE = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;

/** Purple / indigo / cream / terracotta cliché signals in source text. */
const CLICHE_SOURCE_PATTERNS = [
  /purple/i,
  /indigo\s*gradient/i,
  /glassmorphism/i,
  /#f4f1ea/i,
  /terracotta/i,
  /neon\s*glow/i,
  /StatCard/,
  /PromoChip/,
  /HeroOverlay/,
  /MetricStrip/,
];

function walkSourceFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (
      name === "node_modules" ||
      name === "dist" ||
      name === ".turbo" ||
      name === ".git"
    ) {
      continue;
    }
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      walkSourceFiles(p, out);
    } else if (
      name.endsWith(".ts") ||
      name.endsWith(".tsx") ||
      name.endsWith(".css")
    ) {
      out.push(p);
    }
  }
  return out;
}

describe("s6-c UI Kit Prove (16 SSOT)", () => {
  it("exports whitelist primitives + token SSOT only", () => {
    expect(typeof ui.Button).toBe("function");
    expect(typeof ui.IconButton).toBe("function");
    expect(typeof ui.Badge).toBe("function");
    expect(typeof ui.Toolbar).toBe("function");
    expect(typeof ui.Panel).toBe("function");
    expect(typeof ui.DataRow).toBe("function");
    expect(typeof ui.Toast).toBe("function");
    expect(typeof ui.CommandPalette).toBe("function");
    expect(typeof ui.Card).toBe("function");
    expect(ui.CLIME_PRIMITIVE_WHITELIST).toContain("Card");
    for (const forbidden of ui.CLIME_FORBIDDEN_PRIMITIVES) {
      expect(
        Object.prototype.hasOwnProperty.call(ui, forbidden),
      ).toBe(false);
    }
  });

  it("token drift = 0 — every --clime-* in package is in 16 allowlist", () => {
    const files = walkSourceFiles(srcRoot);
    const found = new Set<string>();
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/--clime-[a-z0-9-]+/g)) {
        found.add(m[0]!);
      }
    }
    const unexpected = [...found].filter(
      (t) => !(CLIME_ALL_TOKENS as readonly string[]).includes(t),
    );
    expect(unexpected).toEqual([]);
    for (const required of CLIME_ALL_TOKENS) {
      expect(found.has(required)).toBe(true);
    }
  });

  it("arbitrary hex = 0 outside token definition layer", () => {
    const offenders: string[] = [];
    for (const file of walkSourceFiles(srcRoot)) {
      if (TOKEN_DEF_FILES.has(file)) continue;
      // Prove file may mention forbidden hex as strings under test — allow that file.
      if (file.endsWith("prove.s6c.test.ts")) continue;
      const src = readFileSync(file, "utf8");
      const hexes = src.match(HEX_RE) ?? [];
      if (hexes.length > 0) {
        offenders.push(
          `${relative(pkgRoot, file)}: ${[...new Set(hexes)].join(", ")}`,
        );
      }
    }
    expect(offenders).toEqual([]);
  });

  it("cliché look = 0 in token values + non-definition source signals", () => {
    const values = Object.values(CLIME_TOKEN_VALUES)
      .join("\n")
      .toLowerCase();
    for (const bad of FORBIDDEN_CLICHE_HEX) {
      expect(values).not.toContain(bad.toLowerCase());
    }
    // Accent must stay teal-ink ops
    expect(CLIME_TOKEN_VALUES["--clime-accent"].toLowerCase()).toBe("#0f766e");
    expect(CLIME_TOKEN_VALUES["--clime-bg"].toLowerCase()).not.toBe("#f4f1ea");

    const tokensDir = join(srcRoot, "tokens");
    const relPosix = (file: string) =>
      relative(pkgRoot, file).split("\\").join("/");
    const signalHits: string[] = [];
    for (const file of walkSourceFiles(srcRoot)) {
      const rel = relPosix(file);
      // Token definition layer may document forbidden anchors for the allowlist test.
      if (file.startsWith(tokensDir)) continue;
      if (rel.endsWith("prove.s6c.test.ts")) continue;
      // Whitelist module documents forbidden names by design.
      if (rel === "src/primitives/index.ts") continue;
      if (rel.endsWith("smoke.test.tsx")) continue;
      const src = readFileSync(file, "utf8");
      for (const re of CLICHE_SOURCE_PATTERNS) {
        if (re.test(src)) {
          signalHits.push(`${rel} ~ ${re}`);
        }
      }
    }
    expect(signalHits).toEqual([]);
  });

  it("Card abuse = 0 — policy flag + no default-layout Card helpers", () => {
    const cardSrc = readFileSync(
      join(srcRoot, "primitives", "Card.tsx"),
      "utf8",
    );
    expect(cardSrc).toContain("interactive: true");
    expect(cardSrc).toContain("interactionLabel");
    expect(cardSrc).toContain("interaction-only");
    expect(cardSrc).toMatch(/16 §6\.1|§6\.1/);

    // No marketing card aliases shipped
    const indexSrc = readFileSync(join(srcRoot, "index.ts"), "utf8");
    expect(indexSrc).not.toMatch(/StatCard|PromoChip|MetricStrip|HeroOverlay/);
  });

  it("Pretendard locked on font tokens", () => {
    expect(CLIME_TOKEN_VALUES["--clime-font-sans"]).toContain("Pretendard");
    expect(ui.getClimeTokensCss()).toContain("Pretendard");
  });

  it("tokens.css values match tokens.ts SSOT (case-insensitive colors)", () => {
    const css = readFileSync(join(srcRoot, "tokens", "tokens.css"), "utf8");
    const norm = (s: string) =>
      s.trim().replace(/\s+/g, " ").replace(/"/g, "'").toLowerCase();
    for (const name of CLIME_ALL_TOKENS) {
      const re = new RegExp(
        `${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*([^;]+);`,
      );
      const m = css.match(re);
      expect(m, `missing ${name} in tokens.css`).toBeTruthy();
      expect(norm(m![1]!)).toBe(norm(CLIME_TOKEN_VALUES[name]));
    }
  });
});
