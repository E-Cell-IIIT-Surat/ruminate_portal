import { z } from "zod";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { notFound, safeError } from "@/lib/errors";

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
    const existing = await db.workshop.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw notFound("Workshop");
    const workshop = await db.workshop.update({ where: { id }, data: input });
    await db.auditLog.create({
      data: { actorId: actor.id, action: "workshop.update", entityType: "Workshop", entityId: id, metadata: input },
    });
    return Response.json({ workshop });
  } catch (error) {
    return safeError(error);
  }
}
