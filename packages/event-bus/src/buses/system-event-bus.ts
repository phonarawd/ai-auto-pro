import { createPubSubBus, type PubSubBus, type PubSubHandler } from "./pub-sub-bus.js";

/** Infra/ops signals — multi-subscriber pub/sub (12_INFRASTRUCTURE §6). */
export function createSystemEventBus(): PubSubBus {
  return createPubSubBus();
}

export type SystemEventBus = PubSubBus;
export type SystemEventHandler = PubSubHandler;
