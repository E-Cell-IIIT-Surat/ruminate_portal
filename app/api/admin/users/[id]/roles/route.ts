import { z } from "zod";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError, notFound, safeError } from "@/lib/errors";

const inputSchema = z.object({
  roles: z
    .array(z.enum(["PARTICIPANT", "REVIEWER", "PROGRAM_MANAGER", "CONTENT_MANAGER", "FACULTY_REVIEWER", "SUPER_ADMIN"]))
    .min(1)
    .max(6),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("role:manage");
    await requirePermission("user:manage");
    const { id } = await params;
    const input = inputSchema.parse(await request.json());
    if (!(await db.user.findUnique({ where: { id } }))) throw notFound("User");
    if (id === actor.id && !input.roles.includes("SUPER_ADMIN"))
      throw new AppError("You cannot remove your own Super Admin role", 409, "SELF_LOCKOUT");
    const roles = await db.role.findMany({ where: { name: { in: input.roles } }, select: { id: true, name: true } });
    if (roles.length !== input.roles.length)
      throw new AppError("One or more roles are not initialized", 409, "ROLE_NOT_INITIALIZED");
    await db.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.createMany({ data: roles.map((role) => ({ userId: id, roleId: role.id })) });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "user.roles.update",
          entityType: "User",
          entityId: id,
          metadata: { roles: input.roles },
        },
      });
    });
    return Response.json({ roles: roles.map((role) => role.name) });
  } catch (error) {
    return safeError(error);
  }
}
