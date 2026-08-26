import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError, safeError } from "@/lib/errors";
import { notifyTeamLeaderAboutJoinRequest } from "@/lib/services/teams";

const joinSchema = z.object({
  message: z.string().trim().max(500).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const current = await requireUser();
    const { id } = await params;
    const input = joinSchema.parse(await request.json());
    const team = await db.team.findUniqueOrThrow({
      where: { id },
      include: {
        leader: { select: { id: true, name: true, email: true } },
        members: { select: { userId: true, email: true } },
      },
    });
    if (!team.isPublic || team.status !== "PUBLIC") throw new AppError("This team is not open for join requests", 409);
    if (team.leaderId === current.id) throw new AppError("You already lead this team", 409);
    if (team.members.length >= team.requiredMembers) throw new AppError("This team already has the required members", 409);
    const user = await db.user.findUniqueOrThrow({
      where: { id: current.id },
      select: { id: true, name: true, email: true },
    });
    const alreadyMember = team.members.some(
      (member) => member.userId === user.id || member.email.toLowerCase() === user.email.toLowerCase(),
    );
    if (alreadyMember) throw new AppError("You are already a member of this team", 409);
    const requestRecord = await db.teamJoinRequest.upsert({
      where: { teamId_requesterId: { teamId: team.id, requesterId: user.id } },
      create: { teamId: team.id, requesterId: user.id, message: input.message, status: "PENDING" },
      update: { message: input.message, status: "PENDING", reviewedAt: null, reviewedById: null },
    });
    await notifyTeamLeaderAboutJoinRequest({
      teamId: team.id,
      teamName: team.name,
      leaderId: team.leader.id,
      leaderEmail: team.leader.email,
      requesterLabel: user.name ?? user.email,
    }).catch((notificationError) => {
      console.error("[team join notification failed]", notificationError);
    });
    return Response.json({ request: requestRecord });
  } catch (error) {
    return safeError(error);
  }
}
