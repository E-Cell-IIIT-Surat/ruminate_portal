import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/authz";
import { safeError } from "@/lib/errors";
import { defaultUdbhavWindow } from "@/lib/udbhav";

const memberSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  role: z.string().trim().max(100).optional().or(z.literal("")),
});
const submissionSchema = z.object({
  cycleId: z.string().cuid().optional(),
  teamName: z.string().trim().min(2).max(120),
  teamMembers: z.array(memberSchema).min(1).max(8),
  title: z.string().trim().min(5).max(200),
  challenge: z.string().trim().min(20).max(6000),
  proposal: z.string().trim().min(20).max(10000),
  solution: z.string().trim().min(20).max(10000),
  technology: z.string().trim().min(3).max(4000),
  estimatedBudget: z.coerce.number().nonnegative().max(999999999).optional().nullable(),
  distributionPlan: z.string().trim().min(10).max(6000),
  milestones: z.string().trim().max(6000).optional().or(z.literal("")),
});

export async function GET() {
  try {
    const current = await requireUser();
    const submissions = await db.udbhavSubmission.findMany({
      where: { leaderId: current.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        referenceId: true,
        title: true,
        teamName: true,
        status: true,
        currentStage: true,
        totalScore: true,
        updatedAt: true,
      },
    });
    return Response.json({ submissions });
  } catch (error) {
    return safeError(error);
  }
}

export async function POST(request: Request) {
  try {
    const current = await requireUser();
    const input = submissionSchema.parse(await request.json());
    const window = defaultUdbhavWindow();
    let cycle = input.cycleId
      ? await db.udbhavCycle.findUnique({ where: { id: input.cycleId } })
      : await db.udbhavCycle.findUnique({ where: { year_month: { year: window.year, month: window.month } } });
    if (!cycle) {
      const now = new Date();
      const status =
        now >= window.opensAt && now <= window.closesAt ? "OPEN" : now > window.closesAt ? "CLOSED" : "SCHEDULED";
      cycle = await db.udbhavCycle.upsert({
        where: { year_month: { year: window.year, month: window.month } },
        create: { ...window, status },
        update: {},
      });
    }
    if (!cycle) return Response.json({ error: "This UdbhAV cycle has not been configured yet." }, { status: 422 });
    const now = new Date();
    const dateWindowOpen = now >= cycle.opensAt && now <= cycle.closesAt;
    const manuallyOpened = cycle.status === "OPEN";
    if (cycle.status === "CLOSED" || (!manuallyOpened && !dateWindowOpen))
      return Response.json(
        { error: "UdbhAV submissions are open only during the published monthly window." },
        { status: 422 },
      );
    const referenceId = `UBH-${cycle.year}-${String(cycle.month).padStart(2, "0")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const submission = await db.udbhavSubmission.create({
      data: {
        referenceId,
        cycleId: cycle.id,
        leaderId: current.id,
        teamName: input.teamName,
        teamMembers: input.teamMembers,
        title: input.title,
        challenge: input.challenge,
        proposal: input.proposal,
        solution: input.solution,
        technology: input.technology,
        estimatedBudget: input.estimatedBudget ?? null,
        distributionPlan: input.distributionPlan,
        milestones: input.milestones || null,
        status: "SUBMITTED",
        submittedAt: now,
      },
      select: { id: true, referenceId: true, status: true },
    });
    await db.udbhavStatusHistory.create({
      data: {
        submissionId: submission.id,
        toStatus: "SUBMITTED",
        stage: "Submission",
        changedById: current.id,
        reason: "Initial submission",
      },
    });
    await db.notification.create({
      data: {
        userId: current.id,
        type: "APPLICATION_STATUS",
        title: "UdbhAV idea submitted",
        body: `Reference ${submission.referenceId} has been received.`,
        href: `/udbhav/submissions/${submission.id}`,
      },
    });
    const invitees = input.teamMembers.filter(
      (member) => member.email.toLowerCase() !== (current.email ?? "").toLowerCase(),
    );
    if (invitees.length) {
      const inviteEmails = invitees.map((member) => member.email.toLowerCase());
      const existingUsers = await db.user.findMany({
        where: { email: { in: inviteEmails } },
        select: { id: true, email: true },
      });
      const knownByEmail = new Map(existingUsers.map((user) => [user.email.toLowerCase(), user.id]));
      await db.$transaction([
        ...invitees
          .filter((member) => knownByEmail.has(member.email.toLowerCase()))
          .map((member) =>
            db.notification.create({
              data: {
                userId: knownByEmail.get(member.email.toLowerCase())!,
                type: "APPLICATION_STATUS",
                title: `You were added to ${input.teamName}`,
                body: `${current.name ?? current.email} added you to the UdbhAV idea “${input.title}”.`,
                href: `/udbhav/submissions/${submission.id}`,
              },
            }),
          ),
        ...invitees.map((member) =>
          db.emailDelivery.create({
            data: {
              recipientEmail: member.email.toLowerCase(),
              templateKey: "udbhav.team.invite",
              subject: `You have been invited to a UdbhAV team`,
              textBody: `${current.name ?? current.email} added you to the team “${input.teamName}” for the UdbhAV idea “${input.title}”. Sign in to the Ruminate portal to view the submission.`,
            },
          }),
        ),
      ]);
    }
    return Response.json({ submission }, { status: 201 });
  } catch (error) {
    return safeError(error);
  }
}
