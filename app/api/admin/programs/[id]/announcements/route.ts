import { z } from "zod";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { ApplicationStatus, Prisma } from "@prisma/client";

const applicationStatuses = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "CHANGES_REQUESTED",
  "SHORTLISTED",
  "SELECTED",
  "REJECTED",
  "APPROVED",
  "WAITLISTED",
  "CONFIRMED",
] as const;

const schema = z
  .object({
    title: z.string().min(3).max(160),
    body: z.string().min(5).max(10000),
    publishedAt: z.coerce.date().optional(),
    expiresAt: z.coerce.date().nullable().optional(),
    targetType: z.enum(["ALL_APPLICANTS", "SUBMITTED_APPLICANTS", "STATUS", "STAGE"]).default("ALL_APPLICANTS"),
    targetStatus: z.enum(applicationStatuses).optional(),
    targetStageId: z.string().cuid().optional(),
  })
  .superRefine((input, context) => {
    if (input.targetType === "STATUS" && !input.targetStatus)
      context.addIssue({ code: "custom", path: ["targetStatus"], message: "Choose an application status" });
    if (input.targetType === "STAGE" && !input.targetStageId)
      context.addIssue({ code: "custom", path: ["targetStageId"], message: "Choose a program stage" });
  });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requirePermission("announcement:create", id);
    const input = schema.parse(await request.json());
    await enforceRateLimit(`announcement:${actor.id}:${id}`, 5, 300);

    if (
      input.targetType === "STAGE" &&
      !(await db.programStage.findFirst({ where: { id: input.targetStageId, programId: id } }))
    )
      return Response.json({ error: "Stage not found for this program" }, { status: 422 });

    const audience: Prisma.ApplicationWhereInput =
      input.targetType === "STATUS"
        ? { programId: id, status: input.targetStatus }
        : input.targetType === "STAGE"
          ? { programId: id, stageId: input.targetStageId }
          : input.targetType === "SUBMITTED_APPLICANTS"
            ? {
                programId: id,
                status: { notIn: [ApplicationStatus.DRAFT, ApplicationStatus.WITHDRAWN, ApplicationStatus.ARCHIVED] },
              }
            : { programId: id, status: { notIn: [ApplicationStatus.WITHDRAWN, ApplicationStatus.ARCHIVED] } };
    const applicants = await db.application.findMany({
      where: audience,
      distinct: ["userId"],
      select: { userId: true, user: { select: { email: true } } },
    });

    const announcement = await db.$transaction(async (tx) => {
      const created = await tx.announcement.create({
        data: {
          programId: id,
          createdById: actor.id,
          title: input.title,
          body: input.body,
          publishedAt: input.publishedAt ?? new Date(),
          expiresAt: input.expiresAt,
          targetType: input.targetType,
          targetValue: input.targetStatus ?? input.targetStageId,
        },
      });
      if (applicants.length) {
        await tx.notification.createMany({
          data: applicants.map(({ userId }) => ({
            userId,
            type: "ANNOUNCEMENT",
            title: input.title,
            body: input.body.slice(0, 240),
            href: "/dashboard",
          })),
        });
        await tx.emailDelivery.createMany({
          data: applicants.map(({ user }) => ({
            programId: id,
            recipientEmail: user.email,
            templateKey: "announcement.published",
            subject: input.title,
            textBody: input.body,
          })),
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          programId: id,
          action: "announcement.create",
          entityType: "Announcement",
          entityId: created.id,
          metadata: {
            recipients: applicants.length,
            targetType: input.targetType,
            targetValue: input.targetStatus ?? input.targetStageId,
          },
        },
      });
      return created;
    });
    return Response.json({ announcement, recipients: applicants.length }, { status: 201 });
  } catch (error) {
    return safeError(error);
  }
}
