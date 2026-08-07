import { describe, expect, it } from "vitest";
import { createToolDomainHandlers } from "./api.js";
import { createToolEngine } from "./engine.js";

describe("@clime/tool", () => {
  it("lists seeded browser profiles", () => {
    const engine = createToolEngine();
    const profiles = engine.profiles.listProfiles();
    expect(profiles.length).toBeGreaterThan(0);
    expect(profiles[0]?.schema_version).toBe(1);
    expect(profiles[0]?.kind).toBe("browser");
  });

  it("pickFile / pickDirectory return null via null FS port", async () => {
    const engine = createToolEngine();
    const handlers = createToolDomainHandlers(engine, {
      generateJobId: () => "job_test_ocr",
    });
    const file = await handlers["tool.pickFile"]!(
      {},
      { requestId: "r1", traceId: "tr1" },
    );
    const dir = await handlers["tool.pickDirectory"]!(
      {},
      { requestId: "r2", traceId: "tr2" },
    );
    expect(file).toMatchObject({ schema_version: 1, filePath: null });
    expect(dir).toMatchObject({ schema_version: 1, dirPath: null });
  });

  it("runOcr returns jobId immediately (non-blocking)", async () => {
    const engine = createToolEngine();
    const handlers = createToolDomainHandlers(engine, {
      generateJobId: () => "job_ocr_1",
    });
    const ack = (await handlers["tool.runOcr"]!(
      { filePath: "C:/tmp/scan.png" },
      { requestId: "r3", traceId: "tr_ocr" },
    )) as { jobId: string; traceId: string };
    expect(ack.jobId).toBe("job_ocr_1");
    expect(ack.traceId).toBe("tr_ocr");
  });
});
