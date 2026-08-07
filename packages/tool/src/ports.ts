/**
 * FS / OCR ports — no Playwright (BAE only in @clime/browser-automation).
 * Headless/host may inject dialog adapters; defaults return null / job ack.
 */
export type ToolFsPort = {
  pickFile: (options?: { filters?: string[] }) => Promise<string | null>;
  pickDirectory: () => Promise<string | null>;
};

export type ToolOcrPort = {
  /** Enqueue OCR; returns jobId immediately (UI non-block). */
  runOcr: (input: {
    filePath?: string;
    traceId: string;
    generateJobId: () => string;
  }) => Promise<{ jobId: string; traceId: string; schema_version: 1 }>;
};

export function createNullFsPort(): ToolFsPort {
  return {
    pickFile: async () => null,
    pickDirectory: async () => null,
  };
}

export function createStubOcrPort(): ToolOcrPort {
  return {
    runOcr: async ({ traceId, generateJobId }) => ({
      schema_version: 1 as const,
      jobId: generateJobId(),
      traceId,
    }),
  };
}
