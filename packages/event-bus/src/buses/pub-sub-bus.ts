import type { BusEnvelope } from "../envelope.js";
import { parseBusEnvelope } from "../envelope.js";

export type Unsubscribe = () => void;

export type PubSubHandler = (event: BusEnvelope) => void | Promise<void>;

type Subscription = {
  type: string | "*";
  handler: PubSubHandler;
};

/** Internal pub/sub engine — not exported; each logical bus gets its own instance. */
export function createPubSubBus() {
  const subscriptions: Subscription[] = [];

  function subscribe(type: string | "*", handler: PubSubHandler): Unsubscribe {
    const subscription: Subscription = { type, handler };
    subscriptions.push(subscription);
    return () => {
      const index = subscriptions.indexOf(subscription);
      if (index >= 0) {
        subscriptions.splice(index, 1);
      }
    };
  }

  async function publish(raw: unknown): Promise<void> {
    const event = parseBusEnvelope(raw);
    const handlers = subscriptions.filter(
      (subscription) =>
        subscription.type === "*" || subscription.type === event.type,
    );

    await Promise.all(handlers.map((subscription) => subscription.handler(event)));
  }

  return { subscribe, publish };
}

export type PubSubBus = ReturnType<typeof createPubSubBus>;
