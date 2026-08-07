import { createCommandBus, type CommandBus } from "./buses/command-bus.js";
import { createDomainEventBus, type DomainEventBus } from "./buses/domain-event-bus.js";
import { createQueryBus, type QueryBus } from "./buses/query-bus.js";
import { createSystemEventBus, type SystemEventBus } from "./buses/system-event-bus.js";

export type EventBuses = {
  /** Imperative intents — dispatch to a single handler per type. */
  command: CommandBus;
  /** Read models — ask returns handler result. */
  query: QueryBus;
  /** Growth/content facts — multi-subscriber. */
  domain: DomainEventBus;
  /** Infra/ops signals — multi-subscriber. */
  system: SystemEventBus;
};

/**
 * Create the four internal buses as separate instances.
 * Anti-pattern guard: no single undifferentiated EventBus (12 §15.3).
 */
export function createEventBuses(): EventBuses {
  return {
    command: createCommandBus(),
    query: createQueryBus(),
    domain: createDomainEventBus(),
    system: createSystemEventBus(),
  };
}
