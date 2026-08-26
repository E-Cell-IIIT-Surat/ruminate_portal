import { z } from "zod";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError, safeError } from "@/lib/errors";
import { notifyTeamApprovalDecision } from "@/lib/services/teams";

const actionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "CLOSE", "ARCHIVE"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("user:manage");
    const { id } = await params;
    const input = actionSchema.parse(await request.json());
    const team = await db.team.findUniqueOrThrow({
      where: { id },
      include: { leader: { select: { id: true, email: true } } },
    });
    if (team.applicationId && input.action === "REJECT") {
      throw new AppError("Application teams cannot be rejected from the public directory", 409);
    }
    const data =
      input.action === "APPROVE"
        ? { status: "PUBLIC" as const, isPublic: true, approvedAt: new Date(), approvedById: actor.id }
        : input.action === "REJECT"
          ? { status: "REJECTED" as const, isPublic: false, approvedAt: null, approvedById: actor.id }
          : input.action === "CLOSE"
            ? { status: "CLOSED" as const, isPublic: false }
            : { status: "ARCHIVED" as const, isPublic: false };
    const updated = await db.$transaction(async (tx) => {
      const saved = await tx.team.update({ where: { id }, data });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: `team.${input.action.toLowerCase()}`,
          entityType: "Team",
          entityId: id,
          metadata: { previousStatus: team.status, nextStatus: saved.status },
        },
      });
      return saved;
    });
    if (input.action === "APPROVE" || input.action === "REJECT") {
      await notifyTeamApprovalDecision({
        teamId: team.id,
        teamName: team.name,
        leaderId: team.leader.id,
        leaderEmail: team.leader.email,
        approved: input.action === "APPROVE",
      }).catch((notificationError) => {
        console.error("[team approval notification failed]", notificationError);
      });
    }
    return Response.json({ team: updated });
  } catch (error) {
    return safeError(error);
  }
}
