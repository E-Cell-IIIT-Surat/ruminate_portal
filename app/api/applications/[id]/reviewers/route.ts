import { z } from "zod";
import { requireApplicationAccess, requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";

const schema = z.object({
  reviewerId: z.string().cuid(),
  rubricId: z.string().cuid(),
  dueAt: z.coerce.date().nullable().optional(),
});
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireApplicationAccess(id);
    const actor = await requirePermission("reviewer:assign", access.application.programId);
    const input = schema.parse(await request.json());
    const rubric = await db.rubric.findFirst({
      where: { id: input.rubricId, programId: access.application.programId },
    });
    if (!rubric) return Response.json({ error: "Rubric not found for this program" }, { status: 404 });
    const application = await db.application.findUniqueOrThrow({ where: { id }, select: { stageId: true } });
    if (rubric.stageId && rubric.stageId !== application.stageId)
      return Response.json({ error: "This rubric belongs to a different application stage" }, { status: 422 });
    const reviewer = await db.user.findFirst({
      where: {
        id: input.reviewerId,
        archivedAt: null,
        roles: { some: { role: { name: { in: ["REVIEWER", "FACULTY_REVIEWER", "SUPER_ADMIN"] } } } },
      },
      select: { email: true },
    });
    if (!reviewer) return Response.json({ error: "Select a user with a reviewer role" }, { status: 422 });
    const assignment = await db.$transaction(async (tx) => {
      const created = await tx.reviewerAssignment.upsert({
        where: {
          applicationId_reviewerId_rubricId: {
            applicationId: id,
            reviewerId: input.reviewerId,
            rubricId: input.rubricId,
          },
        },
        create: {
          applicationId: id,
          reviewerId: input.reviewerId,
          rubricId: input.rubricId,
          assignedById: actor.id,
          dueAt: input.dueAt,
        },
        update: { dueAt: input.dueAt, status: "ASSIGNED" },
      });
      if (["SUBMITTED", "SHORTLISTED"].includes(access.application.status)) {
        await tx.application.update({ where: { id }, data: { status: "UNDER_REVIEW" } });
        await tx.applicationStatusHistory.create({
          data: {
            applicationId: id,
            fromStatus: access.application.status,
            toStatus: "UNDER_REVIEW",
            changedById: actor.id,
            reason: "Reviewer assigned",
          },
        });
      }
      await tx.notification.create({
        data: {
          userId: input.reviewerId,
          applicationId: id,
          type: "REVIEW_ASSIGNED",
          title: "New review assigned",
          body: "A new application is ready for your review.",
          href: `/reviewer/reviews/${created.id}`,
        },
      });
      const program = await tx.program.findUniqueOrThrow({
        where: { id: access.application.programId },
        select: { name: true },
      });
      await tx.emailDelivery.create({
        data: {
          programId: access.application.programId,
          recipientEmail: reviewer.email,
          templateKey: "review.assigned",
          subject: `${program.name}: review assigned`,
          textBody: "A new application has been assigned to you. Sign in to Ruminate Portal to complete the review.",
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          programId: access.application.programId,
          action: "reviewer.assign",
          entityType: "ReviewerAssignment",
          entityId: created.id,
        },
      });
      return created;
    });
    return Response.json({ assignment }, { status: 201 });
  } catch (error) {
    return safeError(error);
  }
}
