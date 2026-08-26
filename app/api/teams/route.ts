import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";
import { notifyAdminsAboutTeamRequest } from "@/lib/services/teams";

const createTeamSchema = z.object({
  name: z.string().trim().min(2).max(100),
  motto: z.string().trim().min(4).max(180),
  projectSummary: z.string().trim().min(10).max(1200),
  lookingFor: z.string().trim().min(4).max(500),
  requiredMembers: z.coerce.number().int().min(2).max(12),
});

export async function POST(request: Request) {
  try {
    const current = await requireUser();
    const input = createTeamSchema.parse(await request.json());
    const user = await db.user.findUniqueOrThrow({
      where: { id: current.id },
      select: { id: true, name: true, email: true, phone: true, institution: true },
    });
    const team = await db.$transaction(async (tx) => {
      const saved = await tx.team.create({
        data: {
          leaderId: user.id,
          name: input.name,
          motto: input.motto,
          projectSummary: input.projectSummary,
          lookingFor: input.lookingFor,
          requiredMembers: input.requiredMembers,
          status: "PENDING_APPROVAL",
          isPublic: false,
          members: {
            create: {
              userId: user.id,
              name: user.name ?? user.email.split("@")[0],
              email: user.email.toLowerCase(),
              phone: user.phone,
              institution: user.institution,
              role: "Team leader",
              isLeader: true,
              order: 1,
            },
          },
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "team.request.create",
          entityType: "Team",
          entityId: saved.id,
          metadata: { name: input.name, requiredMembers: input.requiredMembers },
        },
      });
      return saved;
    });
    await notifyAdminsAboutTeamRequest(team.id, team.name, user.name ?? user.email).catch((notificationError) => {
      console.error("[team notification failed]", notificationError);
    });
    return Response.json({ team });
  } catch (error) {
    return safeError(error);
  }
}
