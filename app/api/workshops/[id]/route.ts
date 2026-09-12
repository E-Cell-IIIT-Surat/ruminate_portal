import { z } from "zod";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError, notFound, safeError } from "@/lib/errors";

const schema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"]).optional(),
  registrationOpenAt: z.preprocess((value) => (value === "" ? null : value), z.coerce.date().nullable().optional()),
  registrationCloseAt: z.preprocess((value) => (value === "" ? null : value), z.coerce.date().nullable().optional()),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("program:update");
    const { id } = await params;
    const input = schema.parse(await request.json());
    const existing = await db.workshop.findUnique({ where: { id } });
    if (!existing) throw notFound("Workshop");
    if (existing.archivedAt) throw notFound("Workshop");
    const merged = { ...existing, ...input };
    if (
      merged.registrationOpenAt &&
      merged.registrationCloseAt &&
      merged.registrationCloseAt <= merged.registrationOpenAt
    )
      throw new AppError("Closing time must be after opening time", 422, "INVALID_DATES");
    if (input.status === "PUBLISHED" && merged.registrationCloseAt && merged.registrationCloseAt <= new Date())
      throw new AppError("Choose a future closing time before launching", 422, "INVALID_DATES");
    const workshop = await db.workshop.update({ where: { id }, data: input });
    await db.auditLog.create({
      data: { actorId: actor.id, action: "workshop.update", entityType: "Workshop", entityId: id, metadata: input },
    });
    return Response.json({ workshop });
  } catch (error) {
    return safeError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("program:update");
    const { id } = await params;
    await db.$transaction(async (tx) => {
      await tx.workshop.update({ where: { id }, data: { status: "CANCELLED", archivedAt: new Date() } });
      await tx.auditLog.create({
        data: { actorId: actor.id, action: "workshop.delete", entityType: "Workshop", entityId: id },
      });
    });
    return Response.json({ success: true });
  } catch (error) {
    return safeError(error);
  }
}
