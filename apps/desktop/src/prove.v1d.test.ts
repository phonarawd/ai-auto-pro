/**
 * V1-D Final Sign-off Prove —
 * UX Gate · silent-failure 0 · queue bypass 0 · Capability honesty
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");
const rendererRoot = join(repoRoot, "apps/desktop/src/renderer");

const FORBIDDEN_BYPASS_CTA = [
  /\bcaptcha\s*bypass\b/i,
  /\bbypass\s*captcha\b/i,
  /\bbypass\s*now\b/i,
  /우회\s*하기/,
  /solve\s*captcha/i,
  /fingerprint\s*spoof/i,
];

function walkTsx(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__eslint_fixtures__") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkTsx(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !name.includes(".test.")) out.push(p);
  }
  return out;
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

describe("V1-D Final Sign-off Prove", () => {
  it("UX Gate prove stamps retained GREEN", () => {
    for (const rel of [
      "docs/appendix/S8C_MISSION_UX_GATE_PROVE.md",
      "docs/appendix/FC_TRUST_PROVE.md",
      "docs/appendix/KC_SETTINGS_KNOWLEDGE_PROVE.md",
    ]) {
      const body = readFileSync(join(repoRoot, rel), "utf8");
      expect(body).toMatch(/\*?Status:\*?\*?\s*GREEN/i);
    }
  });

  it("Mission Center exposes honest Capability fields + Trace", () => {
    const files = walkTsx(rendererRoot);
    const mission = files.find((f) => /MissionCenter/i.test(f));
    expect(mission, "MissionCenter component").toBeTruthy();
    const src = readFileSync(mission!, "utf8");
    expect(src).toMatch(/canPublish/);
    expect(src).toMatch(/publishMode/);
    expect(src).toMatch(/riskLevel/);
    expect(src).toMatch(/traceId|Trace/i);
    expect(src).toMatch(/파일로 보관|내보내기 백업|backup|COPY\.cta\.export/i);
  });

  it("renderer has zero captcha-bypass CTAs (침묵실패 / 우회 0)", () => {
    for (const f of walkTsx(rendererRoot)) {
      const code = stripComments(readFileSync(f, "utf8"));
      for (const re of FORBIDDEN_BYPASS_CTA) {
        expect(code, `${f} ↔ ${re}`).not.toMatch(re);
      }
    }
  });

  it("START path documents Queue-only (queue bypass 0)", () => {
    const runtime = readFileSync(
      join(repoRoot, "packages/automation/src/runtime.ts"),
      "utf8",
    );
    expect(runtime).toMatch(/enqueueMission/);
    expect(runtime).toMatch(/never invoke Worker|Never leases|Queue only/i);

    const api = readFileSync(
      join(repoRoot, "packages/automation/src/api.ts"),
      "utf8",
    );
    // Domain startMission must not call lease/tick inline
    const startIdx = api.indexOf("startMission");
    expect(startIdx).toBeGreaterThanOrEqual(0);
    const slice = api.slice(startIdx, startIdx + 800);
    expect(slice).not.toMatch(/leaseNext/);
    expect(slice).not.toMatch(/\.tick\(/);
  });

  it("challenge E2E + V1 prove docs exist for sign-off chain", () => {
    expect(
      existsSync(join(repoRoot, "apps/desktop/src/e2e.challenge-pause.test.ts")),
    ).toBe(true);
    expect(
      existsSync(join(repoRoot, "docs/appendix/V1A_PRODUCT_LOOP_PROVE.md")),
    ).toBe(true);
    expect(
      existsSync(join(repoRoot, "docs/appendix/V1B_ARCHITECTURE_PROVE.md")),
    ).toBe(true);
    expect(
      existsSync(join(repoRoot, "docs/appendix/V1C_QUALITY_PROVE.md")),
    ).toBe(true);
    expect(
      existsSync(join(repoRoot, "docs/appendix/V1D_FINAL_SIGNOFF.md")),
    ).toBe(true);
  });

  it("03_NEXT_ACTIONS and operate guide reference V1 complete / post-V1", () => {
    const next = readFileSync(
      join(repoRoot, "docs/setup/03_NEXT_ACTIONS.md"),
      "utf8",
    );
    expect(next).toMatch(/V1.*(완료|GREEN|complete|DONE|Acceptance)/i);

    const operate = readFileSync(
      join(repoRoot, "docs/setup/04_HOW_TO_OPERATE.md"),
      "utf8",
    );
    expect(operate).toMatch(/CLIME AI Growth Studio/);
    expect(operate).toMatch(/연구 → 결정 → 생성/);
  });
});
