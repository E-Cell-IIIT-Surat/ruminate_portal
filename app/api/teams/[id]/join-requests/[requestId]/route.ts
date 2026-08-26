import { z } from "zod";
import { requireUser, userAuthorization } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError, forbidden, safeError } from "@/lib/errors";
import { notifyJoinRequestDecision } from "@/lib/services/teams";

const decisionSchema = z.object({
  action: z.enum(["ACCEPT", "REJECT"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; requestId: string }> }) {
  try {
    const current = await requireUser();
    const authorization = await userAuthorization(current.id);
    const { id, requestId } = await params;
    const input = decisionSchema.parse(await request.json());
    const joinRequest = await db.teamJoinRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: {
        requester: { select: { id: true, name: true, email: true, phone: true, institution: true } },
        team: {
          include: {
            members: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
          },
        },
      },
    });
    if (joinRequest.teamId !== id) throw new AppError("Join request does not belong to this team", 400);
    if (joinRequest.team.leaderId !== current.id && !authorization.isSuperAdmin) throw forbidden();
    if (joinRequest.status !== "PENDING") throw new AppError("This request has already been reviewed", 409);

    const accepted = input.action === "ACCEPT";
    if (accepted && joinRequest.team.members.length >= joinRequest.team.requiredMembers) {
      throw new AppError("This team already has the required members", 409);
    }

    await db.$transaction(async (tx) => {
      await tx.teamJoinRequest.update({
        where: { id: joinRequest.id },
        data: {
          status: accepted ? "ACCEPTED" : "REJECTED",
          reviewedAt: new Date(),
          reviewedById: current.id,
        },
      });
      if (accepted) {
        await tx.teamMember.upsert({
          where: { teamId_email: { teamId: joinRequest.teamId, email: joinRequest.requester.email.toLowerCase() } },
          create: {
            teamId: joinRequest.teamId,
            userId: joinRequest.requester.id,
            name: joinRequest.requester.name ?? joinRequest.requester.email.split("@")[0],
            email: joinRequest.requester.email.toLowerCase(),
            phone: joinRequest.requester.phone,
            institution: joinRequest.requester.institution,
            role: "Member",
            order: joinRequest.team.members.length + 1,
          },
          update: { userId: joinRequest.requester.id },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: current.id,
          action: accepted ? "team.join.accept" : "team.join.reject",
          entityType: "TeamJoinRequest",
          entityId: joinRequest.id,
          metadata: { teamId: joinRequest.teamId, requesterId: joinRequest.requesterId },
        },
      });
    });

    await notifyJoinRequestDecision({
      teamId: joinRequest.teamId,
      teamName: joinRequest.team.name,
      requesterId: joinRequest.requester.id,
      requesterEmail: joinRequest.requester.email,
      accepted,
    }).catch((notificationError) => {
      console.error("[team join decision notification failed]", notificationError);
    });
    return Response.json({ ok: true, status: accepted ? "ACCEPTED" : "REJECTED" });
  } catch (error) {
    return safeError(error);
  }
}
