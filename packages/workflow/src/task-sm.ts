import {
  taskStateSchema,
  type TaskState,
} from "@clime/shared";

const HAPPY_PATH: readonly TaskState[] = [
  "QUEUED",
  "RUNNING",
  "VALIDATING",
  "OPTIMIZING",
  "READY",
  "PUBLISHED",
] as const;

/** Hard terminals — no further transitions (including resume). */
const HARD_TERMINALS = new Set<TaskState>([
  "FAILED",
  "CANCELLED",
  "PUBLISHED",
]);

/** Soft block states — may resume to RUNNING (B3A §6.1 resumeRun). */
const SOFT_BLOCKS = new Set<TaskState>([
  "BLOCKED_HUMAN",
  "BLOCKED_CAPABILITY",
  "BLOCKED_POLICY",
  "PAUSED_CHALLENGE",
]);

const BLOCK_OR_FAIL = new Set<TaskState>([
  "FAILED",
  "CANCELLED",
  "BLOCKED_HUMAN",
  "BLOCKED_CAPABILITY",
  "BLOCKED_POLICY",
  "PAUSED_CHALLENGE",
]);

const HAPPY_EDGES = new Set<string>([
  "QUEUED→RUNNING",
  "RUNNING→VALIDATING",
  "VALIDATING→OPTIMIZING",
  "OPTIMIZING→READY",
  "READY→PUBLISHED",
]);

export function isTerminalTaskState(state: TaskState): boolean {
  return HARD_TERMINALS.has(state) || SOFT_BLOCKS.has(state);
}

export function isHardTerminal(state: TaskState): boolean {
  return HARD_TERMINALS.has(state);
}

export function isHappyPathState(state: TaskState): boolean {
  return HAPPY_PATH.includes(state);
}

/**
 * Legal SM edge check — Validate skip = 0 (B3A §3).
 * Rejects RUNNING→OPTIMIZING/READY/PUBLISHED and any other illegal jump.
 * Soft blocks may resume → RUNNING.
 */
export function canTransition(from: TaskState, to: TaskState): boolean {
  taskStateSchema.parse(from);
  taskStateSchema.parse(to);
  if (from === to) return false;
  if (HARD_TERMINALS.has(from)) return false;
  if (SOFT_BLOCKS.has(from)) return to === "RUNNING";
  if (HAPPY_EDGES.has(`${from}→${to}`)) return true;
  if (BLOCK_OR_FAIL.has(to)) return true;
  return false;
}

export type TransitionCheck =
  | { ok: true }
  | { ok: false; code: "ILLEGAL_TRANSITION" | "VALIDATE_SKIP"; message: string };

export function checkTransition(from: TaskState, to: TaskState): TransitionCheck {
  if (canTransition(from, to)) return { ok: true };

  const validateSkip =
    (from === "RUNNING" || from === "QUEUED") &&
    (to === "OPTIMIZING" || to === "READY" || to === "PUBLISHED");

  if (validateSkip || (from === "VALIDATING" && (to === "READY" || to === "PUBLISHED"))) {
    return {
      ok: false,
      code: "VALIDATE_SKIP",
      message: `Illegal Validate-skip transition ${from} → ${to}`,
    };
  }

  return {
    ok: false,
    code: "ILLEGAL_TRANSITION",
    message: `Illegal Task SM transition ${from} → ${to}`,
  };
}

/** Cursor after a node has completed VALIDATING (used by stub runners). */
export function hasPassedValidating(visitedStates: readonly TaskState[]): boolean {
  return visitedStates.includes("VALIDATING");
}
