import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MissionCenterFrame } from "./renderer/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("Desktop Renderer & MissionCenterFrame (s7-b)", () => {
  it("exports MissionCenterFrame component", () => {
    expect(MissionCenterFrame).toBeDefined();
    expect(typeof MissionCenterFrame).toBe("function");
  });

  it("includes Tailwind and Pretendard configuration in globals.css and tailwind.config.js", () => {
    const cssPath = join(__dirname, "renderer/styles/globals.css");
    const tailwindPath = join(__dirname, "../tailwind.config.js");

    const cssContent = readFileSync(cssPath, "utf8");
    const tailwindContent = readFileSync(tailwindPath, "utf8");

    expect(cssContent).toMatch(/@import "@clime\/ui\/tokens.css";/);
    expect(cssContent).toMatch(/var\(--clime-font-sans\)/);
    expect(tailwindContent).toMatch(/var\(--clime-font-sans\)/);
  });
});
