import type { ApplicationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import { canTransitionApplication, isPrivateDecision } from "@/lib/domain/status";

export async function transitionApplication(
  applicationId: string,
  status: ApplicationStatus,
  actorId: string,
  reason: string,
  override = false,
  stageId?: string | null,
) {
  const application = await db.application.findUnique({
    where: { id: applicationId },
    include: { user: { select: { email: true } }, program: { select: { name: true, resultsPublishedAt: true } } },
  });
  if (!application) throw notFound("Application");
  if (!override && !canTransitionApplication(application.status, status))
    throw new AppError(`Cannot move ${application.status} to ${status}`, 409, "INVALID_TRANSITION");
  if (stageId && !(await db.programStage.findFirst({ where: { id: stageId, programId: application.programId } })))
    throw new AppError("The selected stage does not belong to this program", 422, "INVALID_STAGE");
  return db.$transaction(async (tx) => {
    const updated = await tx.application.update({
      where: { id: applicationId },
      data: { status, stageId: stageId ?? undefined, withdrawnAt: status === "WITHDRAWN" ? new Date() : undefined },
    });
    await tx.applicationStatusHistory.create({
      data: { applicationId, fromStatus: application.status, toStatus: status, changedById: actorId, reason },
    });
    if (stageId && stageId !== application.stageId)
      await tx.applicationStageHistory.create({
        data: {
          applicationId,
          programId: application.programId,
          fromStageId: application.stageId,
          toStageId: stageId,
          changedById: actorId,
          reason,
        },
      });
    const visible = !isPrivateDecision(status) || application.program.resultsPublishedAt !== null;
    if (visible) {
      const statusLabel = status.toLowerCase().replaceAll("_", " ");
      await tx.notification.create({
        data: {
          userId: application.userId,
          applicationId,
          type: status === "CHANGES_REQUESTED" ? "CHANGES_REQUESTED" : "APPLICATION_STATUS",
          title: "Application status updated",
          body: `Your application is now ${statusLabel}.`,
          href: `/applications/${applicationId}`,
        },
      });
      await tx.emailDelivery.create({
        data: {
          programId: application.programId,
          recipientEmail: application.user.email,
          templateKey: "application.status",
          subject: `${application.program.name}: application update`,
          textBody: `Your application is now ${statusLabel}. Sign in to Ruminate Portal for details.`,
        },
      });
    }
    await tx.auditLog.create({
      data: {
        actorId,
        programId: application.programId,
        action: override ? "application.status.override" : "application.status.update",
        entityType: "Application",
        entityId: applicationId,
        metadata: { from: application.status, to: status, reason },
      },
    });
    return updated;
  });
}
