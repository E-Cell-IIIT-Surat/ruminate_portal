import { z } from "zod";
import { db } from "@/lib/db";
import { requireUdbhavAdmin } from "@/lib/udbhav";
import { safeError } from "@/lib/errors";

const assignmentSchema = z.object({ reviewerId: z.string().cuid() });

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUdbhavAdmin();
    const { id } = await params;
    const assignments = await db.udbhavReviewerAssignment.findMany({
      where: { submissionId: id },
      include: { reviewer: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });
    return Response.json({ assignments });
  } catch (error) {
    return safeError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { current } = await requireUdbhavAdmin();
    const { id } = await params;
    const { reviewerId } = assignmentSchema.parse(await request.json());
    const [submission, reviewer] = await Promise.all([
      db.udbhavSubmission.findUnique({ where: { id }, select: { id: true, title: true, referenceId: true } }),
      db.user.findFirst({
        where: {
          id: reviewerId,
          archivedAt: null,
          roles: { some: { role: { name: { in: ["REVIEWER", "FACULTY_REVIEWER", "SUPER_ADMIN"] } } } },
        },
        select: { id: true, email: true, name: true },
      }),
    ]);
    if (!submission) return Response.json({ error: "UdbhAV idea not found" }, { status: 404 });
    if (!reviewer) return Response.json({ error: "Select an account with reviewer access" }, { status: 422 });
    const assignment = await db.udbhavReviewerAssignment.upsert({
      where: { submissionId_reviewerId: { submissionId: id, reviewerId } },
      create: { submissionId: id, reviewerId, assignedById: current.id },
      update: { assignedById: current.id, status: "ASSIGNED" },
      include: { reviewer: { select: { id: true, name: true, email: true } } },
    });
    await db.notification.create({
      data: {
        userId: reviewer.id,
        type: "REVIEW_ASSIGNED",
        title: "UdbhAV review assigned",
        body: `You have been assigned to review ${submission.referenceId}: ${submission.title}.`,
        href: `/reviewer/udbhav/${id}`,
      },
    });
    await db.emailDelivery.create({
      data: {
        recipientEmail: reviewer.email,
        templateKey: "udbhav.reviewer.assigned",
        subject: `UdbhAV review assigned: ${submission.title}`,
        textBody: `You have been assigned to review ${submission.title} (${submission.referenceId}). Sign in to Ruminate to submit your score.`,
      },
    });
    return Response.json({ assignment });
  } catch (error) {
    return safeError(error);
  }
}
