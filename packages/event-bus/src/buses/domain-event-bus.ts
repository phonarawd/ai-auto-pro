import { createPubSubBus, type PubSubBus, type PubSubHandler } from "./pub-sub-bus.js";

/** Growth/content facts — multi-subscriber pub/sub (12_INFRASTRUCTURE §6). */
export function createDomainEventBus(): PubSubBus {
  return createPubSubBus();
}

export type DomainEventBus = PubSubBus;
export type DomainEventHandler = PubSubHandler;
