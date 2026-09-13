import test from "node:test";
import assert from "node:assert/strict";
import type { Prisma } from "@prisma/client";
import { reserveProgramSlug } from "../lib/services/program-slug";
import { AppError } from "../lib/errors";

function fixture(existing: { id: string; status: string; archivedAt: Date | null } | null, changed = false) {
  const updates: unknown[] = [];
  const audits: unknown[] = [];
  const locks: unknown[] = [];
  const tx = {
    $executeRaw: async (...args: unknown[]) => {
      locks.push(args);
    },
    program: {
      findUnique: async () => existing,
      updateMany: async (args: unknown) => {
        updates.push(args);
        return { count: changed ? 0 : 1 };
      },
    },
    auditLog: {
      create: async (args: unknown) => {
        audits.push(args);
      },
    },
  } as unknown as Prisma.TransactionClient;
  return { tx, updates, audits, locks };
}

test("new program addresses are locked without changing other events", async () => {
  const f = fixture(null);
  await reserveProgramSlug(f.tx, "ktb", "admin");
  assert.equal(f.locks.length, 1);
  assert.equal(f.updates.length, 0);
});

test("deleted KTB address is released and audited without deleting historical data", async () => {
  const archivedAt = new Date("2026-09-13");
  const f = fixture({ id: "old-ktb", status: "ARCHIVED", archivedAt });
  await reserveProgramSlug(f.tx, "ktb", "admin");
  const update = f.updates[0] as { where: unknown; data: { slug: string } };
  assert.deepEqual(update.where, { id: "old-ktb", slug: "ktb", archivedAt, status: "ARCHIVED" });
  assert.match(update.data.slug, /^deleted-old-ktb-/);
  assert.equal(f.audits.length, 1);
  assert.deepEqual(Object.keys(update.data), ["slug"]);
});

test("active, draft, and inconsistent archived events retain their addresses", async () => {
  for (const status of ["DRAFT", "PUBLISHED", "REGISTRATION_OPEN", "ARCHIVED"]) {
    const f = fixture({ id: "other", status, archivedAt: null });
    await assert.rejects(
      reserveProgramSlug(f.tx, "ktb", "admin"),
      (e: unknown) => e instanceof AppError && e.status === 409 && !!e.fields?.slug && e.code === "PROGRAM_SLUG_IN_USE",
    );
    assert.equal(f.updates.length, 0);
  }
});

test("saving a program's own slug is permitted", async () => {
  const f = fixture({ id: "same", status: "DRAFT", archivedAt: null });
  await reserveProgramSlug(f.tx, "ktb", "admin", "same");
  assert.equal(f.updates.length, 0);
});

test("concurrent restore prevents reclaiming the old address", async () => {
  const f = fixture({ id: "old", status: "ARCHIVED", archivedAt: new Date() }, true);
  await assert.rejects(reserveProgramSlug(f.tx, "ktb", "admin"), /changed while saving/);
  assert.equal(f.audits.length, 0);
});
