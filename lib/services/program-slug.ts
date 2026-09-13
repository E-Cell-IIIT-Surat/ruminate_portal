import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";

type SlugTransaction = Pick<Prisma.TransactionClient, "$executeRaw" | "program" | "auditLog">;

/** Call inside the same transaction as create/update. Historical records keep their IDs. */
export async function reserveProgramSlug(
  tx: SlugTransaction,
  slug: string,
  actorId: string | null,
  currentProgramId?: string,
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`program-slug:${slug}`}))`;
  const existing = await tx.program.findUnique({ where: { slug } });
  if (!existing || existing.id === currentProgramId) return;
  if (!existing.archivedAt || existing.status !== "ARCHIVED") {
    const message =
      "This program address is already used by another event. Choose a different slug, such as ktb-2026-new.";
    throw new AppError(message, 409, "PROGRAM_SLUG_IN_USE", { slug: message });
  }

  // The old address becomes reusable without restoring the old event, attaching
  // its applications to the new event, or permanently deleting historical data.
  const archivedSlug = `deleted-${existing.id}-${randomUUID()}`;
  const moved = await tx.program.updateMany({
    where: { id: existing.id, slug, archivedAt: existing.archivedAt, status: "ARCHIVED" },
    data: { slug: archivedSlug },
  });
  if (moved.count !== 1) {
    throw new AppError("The previous event changed while saving. Please try again.", 409, "PROGRAM_CHANGED");
  }
  await tx.auditLog.create({
    data: {
      actorId,
      programId: existing.id,
      action: "program.slug.release",
      entityType: "Program",
      entityId: existing.id,
      metadata: { previousSlug: slug, archivedSlug },
    },
  });
}
