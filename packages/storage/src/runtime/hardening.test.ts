import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  openSqliteDatabase,
  SQLITE_BUSY_TIMEOUT_MS,
} from "../db/client.js";
import { migrateSqliteDatabase } from "../db/migrate.js";
import { createSqliteStorage } from "../repos/create-sqlite-storage.js";
import { envelopeJson } from "../repos/helpers.js";
import { WriteGate } from "./write-gate.js";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        /* best-effort cleanup */
      }
    }
  }
});

function tempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "clime-storage-hardening-"));
  tempDirs.push(dir);
  return join(dir, "product.sqlite");
}

describe("s2-e-b Storage Hardening — WAL · mutex · IMMEDIATE · runAtomicWrite", () => {
  it("product file DB opens with journal_mode=wal, synchronous=NORMAL, busy_timeout=5000", () => {
    const path = tempDbPath();
    const { sqlite } = openSqliteDatabase({ path });
    try {
      const journal = String(sqlite.pragma("journal_mode", { simple: true }));
      expect(journal.toLowerCase()).toBe("wal");

      const sync = String(sqlite.pragma("synchronous", { simple: true }));
      // SQLite returns 1 for NORMAL
      expect(sync === "1" || sync.toUpperCase() === "NORMAL").toBe(true);

      const busy = Number(sqlite.pragma("busy_timeout", { simple: true }));
      expect(busy).toBe(SQLITE_BUSY_TIMEOUT_MS);

      const fk = Number(sqlite.pragma("foreign_keys", { simple: true }));
      expect(fk).toBe(1);
    } finally {
      sqlite.close();
    }
  });

  it(":memory: open still applies foreign_keys + busy_timeout (WAL not required)", () => {
    const { sqlite } = openSqliteDatabase({ path: ":memory:" });
    try {
      const busy = Number(sqlite.pragma("busy_timeout", { simple: true }));
      expect(busy).toBe(SQLITE_BUSY_TIMEOUT_MS);
      const fk = Number(sqlite.pragma("foreign_keys", { simple: true }));
      expect(fk).toBe(1);
    } finally {
      sqlite.close();
    }
  });

  it("WriteGate write txn path issues BEGIN IMMEDIATE", async () => {
    const { sqlite, db } = openSqliteDatabase({ path: ":memory:" });
    try {
      migrateSqliteDatabase(db);
      const execSpy = vi.spyOn(sqlite, "exec");
      const gate = new WriteGate(sqlite);

      await gate.runImmediateTransaction(() => {
        sqlite.prepare("SELECT 1").get();
      });

      const begins = execSpy.mock.calls
        .map((c) => String(c[0]))
        .filter((sql) => /BEGIN/i.test(sql));
      expect(begins.some((sql) => /IMMEDIATE/i.test(sql))).toBe(true);
      expect(begins.every((sql) => !/DEFERRED/i.test(sql))).toBe(true);
      expect(
        execSpy.mock.calls.some((c) => String(c[0]).toUpperCase() === "COMMIT"),
      ).toBe(true);
    } finally {
      sqlite.close();
    }
  });

  it("repo async mutex serializes concurrent mutations without row loss", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const count = 40;
      const results = await Promise.all(
        Array.from({ length: count }, (_, i) =>
          storage.projects.create({ name: `concurrent-${i}` }),
        ),
      );
      const ids = new Set(results.map((r) => r.id));
      expect(ids.size).toBe(count);
      const listed = await storage.projects.list();
      expect(listed).toHaveLength(count);
    } finally {
      storage.close();
    }
  });

  it("runAtomicWrite success leaves domain fact + pending outbox", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({
        name: "atomic-ok",
      });

      const { missionId, outboxId } = await storage.runAtomicWrite(
        async (uow) => {
          const { id: missionId } = await uow.missions.create({
            projectId,
            missionDate: "2026-08-07",
            title: "paired",
            status: "open",
            priority: 1,
            decisionId: null,
            payloadJson: envelopeJson({ paired: true }),
          });
          const { id: outboxId } = await uow.eventOutbox.enqueue({
            projectId,
            type: "mission.created",
            payloadJson: envelopeJson({ missionId }),
            traceId: "trace-atomic-ok",
            occurredAt: new Date().toISOString(),
            status: "pending",
          });
          return { missionId, outboxId };
        },
      );

      expect(await storage.missions.getById(missionId)).not.toBeNull();
      const pending = await storage.eventOutbox.listPending(10);
      expect(pending.some((row) => row.id === outboxId)).toBe(true);
      expect(pending.find((row) => row.id === outboxId)?.status).toBe(
        "pending",
      );
    } finally {
      storage.close();
    }
  });

  it("runAtomicWrite rolls back domain+outbox together on mid-callback failure", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({
        name: "atomic-fail",
      });

      let missionId = "";
      await expect(
        storage.runAtomicWrite(async (uow) => {
          const created = await uow.missions.create({
            projectId,
            missionDate: "2026-08-07",
            title: "should-rollback",
            status: "open",
            priority: 1,
            decisionId: null,
            payloadJson: envelopeJson({ paired: false }),
          });
          missionId = created.id;
          throw new Error("simulated crash before outbox enqueue");
        }),
      ).rejects.toThrow(/simulated crash/);

      expect(missionId).not.toBe("");
      expect(await storage.missions.getById(missionId)).toBeNull();
      const pending = await storage.eventOutbox.listPending(10);
      expect(pending).toHaveLength(0);
    } finally {
      storage.close();
    }
  });

  it("runAtomicWrite rolls back when outbox enqueue fails after domain insert", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({
        name: "atomic-outbox-fail",
      });

      let missionId = "";
      await expect(
        storage.runAtomicWrite(async (uow) => {
          const created = await uow.missions.create({
            projectId,
            missionDate: "2026-08-07",
            title: "domain-then-bad-outbox",
            status: "open",
            priority: 1,
            decisionId: null,
            payloadJson: envelopeJson({}),
          });
          missionId = created.id;
          await uow.eventOutbox.enqueue({
            projectId,
            type: "mission.created",
            payloadJson: JSON.stringify({ no_version: true }),
            traceId: "trace-bad",
            occurredAt: new Date().toISOString(),
            status: "pending",
          });
        }),
      ).rejects.toThrow();

      expect(await storage.missions.getById(missionId)).toBeNull();
      expect(await storage.eventOutbox.listPending(10)).toHaveLength(0);
    } finally {
      storage.close();
    }
  });

  it("standalone eventOutbox.enqueue still works (outbox-only)", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id } = await storage.eventOutbox.enqueue({
        projectId: null,
        type: "system.ping",
        payloadJson: envelopeJson({ ping: true }),
        traceId: "trace-standalone",
        occurredAt: new Date().toISOString(),
        status: "pending",
      });
      const pending = await storage.eventOutbox.listPending(5);
      expect(pending.some((row) => row.id === id)).toBe(true);
    } finally {
      storage.close();
    }
  });

  it("nested runAtomicWrite joins the same transaction (no deadlock)", async () => {
    const storage = createSqliteStorage({ path: ":memory:" });
    try {
      const { id: projectId } = await storage.projects.create({
        name: "nested-atomic",
      });

      const { outerMissionId, innerOutboxId } = await storage.runAtomicWrite(
        async (uow) => {
          const { id: outerMissionId } = await uow.missions.create({
            projectId,
            missionDate: "2026-08-07",
            title: "outer",
            status: "open",
            priority: 1,
            decisionId: null,
            payloadJson: envelopeJson({}),
          });

          const { id: innerOutboxId } = await storage.runAtomicWrite(
            async (inner) => {
              const enq = await inner.eventOutbox.enqueue({
                projectId,
                type: "mission.created",
                payloadJson: envelopeJson({ outerMissionId }),
                traceId: "trace-nested",
                occurredAt: new Date().toISOString(),
                status: "pending",
              });
              return enq;
            },
          );

          return { outerMissionId, innerOutboxId };
        },
      );

      expect(await storage.missions.getById(outerMissionId)).not.toBeNull();
      expect(
        (await storage.eventOutbox.listPending(5)).some(
          (r) => r.id === innerOutboxId,
        ),
      ).toBe(true);
    } finally {
      storage.close();
    }
  });

  it(
    "public surface does not export mutex / WriteGate / sqlite client",
    async () => {
      const mod = await import("../index.js");
      expect("WriteGate" in mod).toBe(false);
      expect("AsyncMutex" in mod).toBe(false);
      expect("openSqliteDatabase" in mod).toBe(false);
      expect(mod.createSqliteStorage).toBeTypeOf("function");
    },
    20_000,
  );
});
