/**
 * ESLint boundary fixture (s5-b) — intentionally illegal renderer imports.
 * Excluded from normal `pnpm lint` / typecheck; proved via `boundary.eslint.test.ts` with `--no-ignore`.
 */
import "@clime/vault";
import "@clime/event-bus";
import "drizzle-orm";
import "@clime/ai";
import "@clime/storage";

export const BOUNDARY_VIOLATION_FIXTURE = true as const;
