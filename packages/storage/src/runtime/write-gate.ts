import { AsyncLocalStorage } from "node:async_hooks";
import type Database from "better-sqlite3";
import { AsyncMutex } from "./async-mutex.js";

type TxnState = {
  active: boolean;
};

/**
 * Per-DB-handle write gate: async mutex + BEGIN IMMEDIATE transactions
 * (s2-e-a §4–§5).
 */
export class WriteGate {
  private readonly mutex = new AsyncMutex();
  private readonly txn = new AsyncLocalStorage<TxnState>();

  constructor(private readonly sqlite: Database.Database) {}

  /** Serialize all SQLite-touching work on this handle. */
  runExclusive<T>(fn: () => Promise<T> | T): Promise<T> {
    return this.mutex.runExclusive(fn);
  }

  /**
   * Mutex → BEGIN IMMEDIATE → work → COMMIT.
   * Nested calls join the open transaction (s2-e-a §6).
   */
  runImmediateTransaction<T>(fn: () => Promise<T> | T): Promise<T> {
    return this.mutex.runExclusive(async () => {
      const existing = this.txn.getStore();
      if (existing?.active) {
        return fn();
      }

      const state: TxnState = { active: true };
      return this.txn.run(state, async () => {
        this.sqlite.exec("BEGIN IMMEDIATE");
        try {
          const result = await fn();
          this.sqlite.exec("COMMIT");
          return result;
        } catch (error) {
          try {
            this.sqlite.exec("ROLLBACK");
          } catch {
            /* connection may already be rolled back */
          }
          throw error;
        } finally {
          state.active = false;
        }
      });
    });
  }

  /** Whether the current async context is inside an IMMEDIATE txn. */
  inTransaction(): boolean {
    return this.txn.getStore()?.active === true;
  }
}

/** Wrap every function property so bodies run under the per-handle mutex. */
export function wrapRepositoryMethods<T extends object>(
  repo: T,
  gate: WriteGate,
): T {
  const wrapped = {} as T;
  for (const key of Object.keys(repo) as Array<keyof T>) {
    const value = repo[key];
    if (typeof value !== "function") {
      wrapped[key] = value;
      continue;
    }
    const method = value as (...args: unknown[]) => unknown;
    wrapped[key] = ((...args: unknown[]) =>
      gate.runExclusive(() =>
        Promise.resolve(method.apply(wrapped, args)),
      )) as T[keyof T];
  }
  return wrapped;
}
