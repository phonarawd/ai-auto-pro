import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSqliteStorage } from "@clime/storage";
import {
  buildClimePlaybook,
  importClimePlaybookFile,
  parseClimePlaybook,
  writeClimePlaybookFile,
} from "./clime-playbook.js";
import { createDailyGrowthDsl } from "./dsl.js";
import { createWorkflowEngine } from "./engine.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

describe("VG-D .clime playbook export/import", () => {
  it("round-trips schema_version + kind; never auto-START", () => {
    const built = buildClimePlaybook({
      title: "Share loop playbook",
      summary: "Community propagation",
      referralCode: "share01",
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.playbook.schema_version).toBe(1);
    expect(built.playbook.kind).toBe("clime.playbook");
    expect(built.playbook.provenance.generator).toBe("clime.ai.growth_studio");
    expect(built.playbook.referral?.wordmark).toBe("Powered by CLIME Growth OS");

    const imported = parseClimePlaybook(JSON.parse(built.json));
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    expect(imported.autoStarted).toBe(false);
    expect(imported.template.name).toBe("Share loop playbook");
    expect(imported.playbook.schema_version).toBe(built.playbook.schema_version);
  });

  it("strips secret-like prompts on export; rejects poisoned import", () => {
    const withSecret = buildClimePlaybook({
      title: "Sanitize",
      prompts: [
        {
          id: "p1",
          version: "1",
          purpose: "generic",
          template: "use api_key=sk-secret123 forever",
        },
      ],
    });
    expect(withSecret.ok).toBe(true);
    if (!withSecret.ok) return;
    expect(withSecret.playbook.prompts[0]!.template).toBe("[stripped]");

    const rejected = parseClimePlaybook({ kind: "clime.playbook", title: "x" });
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.code).toBe("SCHEMA_REJECT");

    const poisoned = {
      ...withSecret.playbook,
      prompts: [
        {
          id: "p1",
          version: "1",
          purpose: "generic" as const,
          template: "bearer tokensecretvalue99",
        },
      ],
    };
    const poisonImport = parseClimePlaybook(poisoned);
    expect(poisonImport.ok).toBe(false);
  });

  it("must not write under Exports/; extension .clime required", () => {
    const root = mkdtempSync(join(tmpdir(), "clime-vgd-"));
    tempDirs.push(root);
    const badPath = join(root, "Exports", "2026-08-07", "pack.clime");
    const bad = writeClimePlaybookFile(badPath, { title: "Nope" });
    expect(bad.ok).toBe(false);

    mkdirSync(join(root, "Playbooks"), { recursive: true });
    const goodPath = join(root, "Playbooks", "growth.clime");
    const good = writeClimePlaybookFile(goodPath, {
      title: "Good pack",
      dsl: createDailyGrowthDsl(),
    });
    expect(good.ok).toBe(true);
    if (!good.ok) return;
    expect(readFileSync(goodPath, "utf8")).toContain('"kind": "clime.playbook"');

    const fileImport = importClimePlaybookFile(goodPath, { traceId: "tr_vgd" });
    expect(fileImport.ok).toBe(true);
    if (!fileImport.ok) return;
    expect(fileImport.autoStarted).toBe(false);
  });

  it("engine import registers template without starting a run", async () => {
    const root = mkdtempSync(join(tmpdir(), "clime-vgd-eng-"));
    tempDirs.push(root);
    mkdirSync(join(root, "Playbooks"), { recursive: true });
    const path = join(root, "Playbooks", "engine.clime");
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const engine = createWorkflowEngine(storage);
      const before = engine.listTemplates().length;
      const exported = engine.exportClimePlaybook({
        title: "Engine pack",
        filePath: path,
      });
      expect(exported.ok).toBe(true);

      const imported = engine.importClimePlaybook({
        filePath: path,
        traceId: "tr_eng",
      });
      expect(imported.ok).toBe(true);
      if (!imported.ok) return;
      expect(imported.autoStarted).toBe(false);
      expect(engine.listTemplates().length).toBe(before + 1);
      expect(engine.getTemplate(imported.template.id)?.name).toBe("Engine pack");
    } finally {
      storage.close();
    }
  });

  it("rejects non-.clime and forged export_backup kind", () => {
    const root = mkdtempSync(join(tmpdir(), "clime-vgd-bad-"));
    tempDirs.push(root);
    const txt = join(root, "backup.txt");
    writeFileSync(txt, "{}");
    const badExt = importClimePlaybookFile(txt);
    expect(badExt.ok).toBe(false);

    const forged = parseClimePlaybook({
      schema_version: 1,
      kind: "content.export_backup",
      title: "fake",
    });
    expect(forged.ok).toBe(false);
  });

  it("VG-E §4: Export≠유일성공 — .clime share loop is separate success path", () => {
    const built = buildClimePlaybook({ title: "Propagation" });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.playbook.kind).not.toBe("content.export_backup");
    expect(JSON.stringify(built.playbook)).not.toContain("Exports/");
    const round = parseClimePlaybook(JSON.parse(built.json));
    expect(round.ok).toBe(true);
    if (!round.ok) return;
    expect(round.autoStarted).toBe(false);
  });
});
