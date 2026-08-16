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
      if (["SUBMITTED", "SHORTLISTED"].includes(access.application.status))
        await tx.application.update({ where: { id }, data: { status: "UNDER_REVIEW" } });
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
