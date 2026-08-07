import { createNullFsPort, createStubOcrPort, type ToolFsPort, type ToolOcrPort } from "./ports.js";
import { createToolProfileStore, type ToolProfileStore } from "./profiles.js";

export type ToolEngine = {
  profiles: ToolProfileStore;
  fs: ToolFsPort;
  ocr: ToolOcrPort;
};

export function createToolEngine(options?: {
  profiles?: ToolProfileStore;
  fs?: ToolFsPort;
  ocr?: ToolOcrPort;
}): ToolEngine {
  return {
    profiles: options?.profiles ?? createToolProfileStore(),
    fs: options?.fs ?? createNullFsPort(),
    ocr: options?.ocr ?? createStubOcrPort(),
  };
}
