import type { BusEnvelope } from "../envelope.js";
import { parseBusEnvelope } from "../envelope.js";

export type Unsubscribe = () => void;

export type CommandHandler = (command: BusEnvelope) => void | Promise<void>;

/** Imperative intents — one handler per command type (CQRS dispatch). */
export function createCommandBus() {
  const handlers = new Map<string, CommandHandler>();

  function register(type: string, handler: CommandHandler): Unsubscribe {
    if (handlers.has(type)) {
      throw new Error(`CommandBus: handler already registered for "${type}"`);
    }
    handlers.set(type, handler);
    return () => {
      const current = handlers.get(type);
      if (current === handler) {
        handlers.delete(type);
      }
    };
  }

  async function dispatch(raw: unknown): Promise<void> {
    const command = parseBusEnvelope(raw);
    const handler = handlers.get(command.type);
    if (!handler) {
      throw new Error(`CommandBus: no handler registered for "${command.type}"`);
    }
    await handler(command);
  }

  return { register, dispatch };
}

export type CommandBus = ReturnType<typeof createCommandBus>;
