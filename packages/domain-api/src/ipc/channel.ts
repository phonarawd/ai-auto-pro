export const DOMAIN_CHANNEL_PREFIX = "domain:" as const;

export type DomainChannelParts = {
  namespace: string;
  method: string;
};

/**
 * Builds standard IPC channel string for Domain API.
 * Channel format: domain:<namespace>.<method>
 */
export function buildDomainChannel(namespace: string, method: string): string {
  const cleanNs = namespace.toLowerCase().trim();
  const cleanMethod = method.trim();
  return `${DOMAIN_CHANNEL_PREFIX}${cleanNs}.${cleanMethod}`;
}

/**
 * Parses channel name into namespace and method.
 * Returns null if channel does not start with "domain:" or is malformed.
 */
export function parseDomainChannel(channel: string): DomainChannelParts | null {
  if (!channel.startsWith(DOMAIN_CHANNEL_PREFIX)) {
    return null;
  }
  const body = channel.slice(DOMAIN_CHANNEL_PREFIX.length);
  const dotIndex = body.indexOf(".");
  if (dotIndex <= 0 || dotIndex === body.length - 1) {
    return null;
  }
  const namespace = body.slice(0, dotIndex).toLowerCase();
  const method = body.slice(dotIndex + 1);
  return { namespace, method };
}
