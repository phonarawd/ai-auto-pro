import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

/** Renderer ↛ engines / ORM / buses / vault (slice 5 / constitution UI→IPC→Domain API). */
const RENDERER_FORBIDDEN_IMPORT_MESSAGE =
  "Renderer must not import engines/ORM/buses/vault. Use Domain API via preload only (UI → IPC → Domain API).";

const RENDERER_FORBIDDEN_IMPORT_PATTERNS = [
  // Buses
  "@clime/event-bus",
  "@clime/event-bus/*",
  // ORM / storage drivers
  "@clime/storage",
  "@clime/storage/*",
  "drizzle-orm",
  "drizzle-orm/*",
  "better-sqlite3",
  "@prisma/*",
  "@supabase/*",
  // Vault / secrets / session material
  "@clime/vault",
  "@clime/vault/*",
  "@clime/session",
  "@clime/session/*",
  // Engines + infra that must stay behind Domain API host
  "@clime/ai",
  "@clime/ai/*",
  "@clime/feature-management",
  "@clime/feature-management/*",
  "@clime/content",
  "@clime/content/*",
  "@clime/account",
  "@clime/account/*",
  "@clime/workflow",
  "@clime/workflow/*",
  "@clime/automation",
  "@clime/automation/*",
  "@clime/analytics",
  "@clime/analytics/*",
  "@clime/memory",
  "@clime/memory/*",
  "@clime/learning",
  "@clime/learning/*",
  "@clime/meta",
  "@clime/meta/*",
  "@clime/notification",
  "@clime/notification/*",
  "@clime/browser-automation",
  "@clime/browser-automation/*",
  "@clime/tool",
  "@clime/tool/*",
  // Growth engines (Phase D+) — Domain API only from renderer
  "@clime/growth-research",
  "@clime/growth-research/*",
  "@clime/growth-planning",
  "@clime/growth-planning/*",
  "@clime/growth-decision",
  "@clime/growth-decision/*",
  "@clime/growth-revenue",
  "@clime/growth-revenue/*",
  "@clime/growth-knowledge",
  "@clime/growth-knowledge/*",
  // Browser SDKs — BAE home only (C2-B)
  "playwright",
  "playwright/*",
  "puppeteer",
  "puppeteer/*",
];

const PLAYWRIGHT_BOUNDARY_MESSAGE =
  "Playwright/Puppeteer may only be imported from @clime/browser-automation (C2A / RFC 10).";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "coverage/**",
      "docs/**",
      "scripts/**",
      // Intentionally illegal imports — excluded from normal lint; proved with --no-ignore
      "**/__eslint_fixtures__/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["apps/desktop/src/renderer/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: RENDERER_FORBIDDEN_IMPORT_PATTERNS,
              message: RENDERER_FORBIDDEN_IMPORT_MESSAGE,
            },
            {
              regex:
                "(?:^|[\\\\/])packages[\\\\/](?:event-bus|storage|vault|session|ai|feature-management|content|account|workflow|automation|analytics|memory|learning|meta|notification|browser-automation|tool|growth)(?:[\\\\/]|$)",
              message: RENDERER_FORBIDDEN_IMPORT_MESSAGE,
            },
          ],
        },
      ],
    },
  },
  {
    // C2-B: Playwright/Puppeteer home is packages/browser-automation only.
    files: [
      "packages/**/*.{ts,tsx,js,mjs,cjs}",
      "plugins/**/*.{ts,tsx,js,mjs,cjs}",
      "apps/desktop/src/main/**/*.{ts,tsx,js,mjs,cjs}",
    ],
    ignores: ["packages/browser-automation/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "playwright", message: PLAYWRIGHT_BOUNDARY_MESSAGE },
            { name: "puppeteer", message: PLAYWRIGHT_BOUNDARY_MESSAGE },
          ],
        },
      ],
    },
  },
);
