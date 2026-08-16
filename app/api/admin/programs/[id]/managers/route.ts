import { z } from "zod";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";

const schema = z.object({ userId: z.string().cuid() });
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requirePermission("user:manage");
    await requirePermission("program:update", id);
    const { userId } = schema.parse(await request.json());
    const role = await db.role.findUniqueOrThrow({ where: { name: "PROGRAM_MANAGER" } });
    await db.$transaction(async (tx) => {
      await tx.userRole.upsert({
        where: { userId_roleId: { userId, roleId: role.id } },
        create: { userId, roleId: role.id },
        update: {},
      });
      await tx.programManager.upsert({
        where: { programId_userId: { programId: id, userId } },
        create: { programId: id, userId },
        update: {},
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          programId: id,
          action: "program.manager.assign",
          entityType: "User",
          entityId: userId,
        },
      });
    });
    return Response.json({ ok: true });
  } catch (error) {
    return safeError(error);
  }
}
