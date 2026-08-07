import type { BusEnvelope } from "../envelope.js";
import { parseBusEnvelope } from "../envelope.js";

export type Unsubscribe = () => void;

export type QueryHandler<TResult = unknown> = (
  query: BusEnvelope,
) => TResult | Promise<TResult>;

/** Read models — one handler per query type; returns typed result. */
export function createQueryBus() {
  const handlers = new Map<string, QueryHandler>();

  function register<TResult>(
    type: string,
    handler: QueryHandler<TResult>,
  ): Unsubscribe {
    if (handlers.has(type)) {
      throw new Error(`QueryBus: handler already registered for "${type}"`);
    }
    handlers.set(type, handler as QueryHandler);
    return () => {
      const current = handlers.get(type);
      if (current === handler) {
        handlers.delete(type);
      }
    };
  }

  async function ask<TResult = unknown>(raw: unknown): Promise<TResult> {
    const query = parseBusEnvelope(raw);
    const handler = handlers.get(query.type);
    if (!handler) {
      throw new Error(`QueryBus: no handler registered for "${query.type}"`);
    }
    return (await handler(query)) as TResult;
  }

  return { register, ask };
}

export type QueryBus = ReturnType<typeof createQueryBus>;
