import { requireUser, userAuthorization } from "@/lib/authz";
import { db } from "@/lib/db";
import { canDeleteTeam } from "@/lib/domain/team";
import { forbidden, notFound, safeError } from "@/lib/errors";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const actor = await userAuthorization(user.id);
    const { id } = await params;
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`team:${id}`}))`;
      const team = await tx.team.findUnique({ where: { id } });
      if (!team) throw notFound("Team");
      if (!canDeleteTeam({ id: actor.id, canManageUsers: actor.grants.has("user:manage") }, team.leaderId)) {
        throw forbidden();
      }
      await tx.team.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "team.delete",
          entityType: "Team",
          entityId: id,
          metadata: { name: team.name, applicationId: team.applicationId },
        },
      });
    });
    return Response.json({ deleted: true });
  } catch (error) {
    return safeError(error);
  }
}
