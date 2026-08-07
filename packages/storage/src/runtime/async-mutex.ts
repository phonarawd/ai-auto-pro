import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Per-handle async serial queue with same-async-context reentrancy
 * (s2-e-a §5 — nested repo calls / runAtomicWrite must not deadlock).
 */
export class AsyncMutex {
  private readonly depth = new AsyncLocalStorage<number>();
  private tail: Promise<void> = Promise.resolve();

  async runExclusive<T>(fn: () => Promise<T> | T): Promise<T> {
    const currentDepth = this.depth.getStore() ?? 0;
    if (currentDepth > 0) {
      return this.depth.run(currentDepth + 1, () => Promise.resolve(fn()));
    }

    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const previous = this.tail;
    this.tail = previous.then(() => gate);

    await previous;
    try {
      return await this.depth.run(1, () => Promise.resolve(fn()));
    } finally {
      release();
    }
  }

  /** True when the current async context already holds this mutex. */
  isHeld(): boolean {
    return (this.depth.getStore() ?? 0) > 0;
  }
}
