export type ApiPublishRequest = {
  accountId: string;
  platform: string;
  body: string;
  title?: string;
  traceId: string;
};

export type ApiPublishOutcome =
  | { ok: true; externalPostId: string }
  | { ok: false; reason: string };

/**
 * Official API publish adapter port — platform SDKs stay behind Manifest connectors.
 * V1 stub posts deterministically for Matrix `publishMode: api` platforms.
 */
export type ApiPublishAdapter = {
  publish(input: ApiPublishRequest): Promise<ApiPublishOutcome>;
};

export function createStubApiPublishAdapter(): ApiPublishAdapter {
  return {
    async publish(input) {
      if (!input.body.trim()) {
        return { ok: false, reason: "Empty body" };
      }
      return {
        ok: true,
        externalPostId: `api_${input.platform}_${input.accountId}_${Date.now().toString(36)}`,
      };
    },
  };
}
