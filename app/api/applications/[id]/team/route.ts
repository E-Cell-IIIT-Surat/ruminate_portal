import { z } from "zod";
import { requireApplicationAccess } from "@/lib/authz";
import { db } from "@/lib/db";
import { assertTeamSize } from "@/lib/domain/program";
import { safeError } from "@/lib/errors";

const schema = z
  .object({
    name: z.string().min(2).max(100),
    members: z
      .array(
        z.object({
          name: z.string().min(2).max(100),
          email: z.string().email(),
          phone: z.string().max(30).optional(),
          institution: z.string().max(180).optional(),
          role: z.string().max(100).optional(),
          isLeader: z.boolean().default(false),
        }),
      )
      .min(1)
      .max(20),
  })
  .superRefine((value, context) => {
    if (value.members.filter((member) => member.isLeader).length !== 1)
      context.addIssue({ code: "custom", path: ["members"], message: "A team must have exactly one leader" });
    const emails = value.members.map((member) => member.email.toLowerCase());
    if (new Set(emails).size !== emails.length)
      context.addIssue({ code: "custom", path: ["members"], message: "Team member emails must be unique" });
  });
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireApplicationAccess(id, "edit");
    const input = schema.parse(await request.json());
    const program = await db.program.findUniqueOrThrow({ where: { id: access.application.programId } });
    const owner = await db.user.findUniqueOrThrow({ where: { id: access.current.id }, select: { email: true } });
    const leader = input.members.find((member) => member.isLeader)!;
    if (leader.email.toLowerCase() !== owner.email.toLowerCase())
      return Response.json({ error: "The signed-in applicant must remain the team leader" }, { status: 422 });
    assertTeamSize(program.participationMode, program.teamMinSize, program.teamMaxSize, input.members.length);
    const team = await db.$transaction(async (tx) => {
      const saved = await tx.team.upsert({
        where: { applicationId: id },
        create: { applicationId: id, programId: program.id, leaderId: access.current.id, name: input.name },
        update: { name: input.name },
      });
      await tx.teamMember.deleteMany({ where: { teamId: saved.id } });
      await tx.teamMember.createMany({
        data: input.members.map((member, order) => ({ ...member, teamId: saved.id, order: order + 1 })),
      });
      return saved;
    });
    return Response.json({ team });
  } catch (error) {
    return safeError(error);
  }
}
