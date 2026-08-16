import { z } from "zod";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError, notFound, safeError } from "@/lib/errors";

const inputSchema = z.object({ active: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("user:manage");
    const { id } = await params;
    const { active } = inputSchema.parse(await request.json());
    if (actor.id === id && !active) throw new AppError("You cannot disable your own account", 409, "SELF_LOCKOUT");
    const existing = await db.user.findUnique({ where: { id }, select: { archivedAt: true } });
    if (!existing) throw notFound("User");
    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { archivedAt: active ? null : new Date() } });
      if (!active) await tx.session.deleteMany({ where: { userId: id } });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: active ? "user.access.restore" : "user.access.disable",
          entityType: "User",
          entityId: id,
        },
      });
    });
    return Response.json({ active });
  } catch (error) {
    return safeError(error);
  }
}
