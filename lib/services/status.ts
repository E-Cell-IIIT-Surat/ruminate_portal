import type { ApplicationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";

const transitions: Record<ApplicationStatus, ApplicationStatus[]> = {
  DRAFT: ["SUBMITTED", "WITHDRAWN", "ARCHIVED"],
  SUBMITTED: ["UNDER_REVIEW", "CHANGES_REQUESTED", "SHORTLISTED", "REJECTED", "WAITLISTED", "WITHDRAWN", "ARCHIVED"],
  UNDER_REVIEW: ["CHANGES_REQUESTED", "SHORTLISTED", "SELECTED", "REJECTED", "APPROVED", "WAITLISTED", "ARCHIVED"],
  CHANGES_REQUESTED: ["SUBMITTED", "REJECTED", "WITHDRAWN", "ARCHIVED"],
  SHORTLISTED: ["UNDER_REVIEW", "SELECTED", "REJECTED", "WAITLISTED", "ARCHIVED"],
  SELECTED: ["CONFIRMED", "REJECTED", "ARCHIVED"],
  REJECTED: ["UNDER_REVIEW", "ARCHIVED"],
  APPROVED: ["CONFIRMED", "ARCHIVED"],
  WAITLISTED: ["CONFIRMED", "REJECTED", "WITHDRAWN", "ARCHIVED"],
  CONFIRMED: ["WITHDRAWN", "ARCHIVED"],
  WITHDRAWN: ["DRAFT", "ARCHIVED"],
  ARCHIVED: ["DRAFT"],
};

export async function transitionApplication(
  applicationId: string,
  status: ApplicationStatus,
  actorId: string,
  reason: string,
  override = false,
) {
  const application = await db.application.findUnique({ where: { id: applicationId } });
  if (!application) throw notFound("Application");
  if (!override && !transitions[application.status].includes(status))
    throw new AppError(`Cannot move ${application.status} to ${status}`, 409, "INVALID_TRANSITION");
  return db.$transaction(async (tx) => {
    const updated = await tx.application.update({
      where: { id: applicationId },
      data: { status, withdrawnAt: status === "WITHDRAWN" ? new Date() : undefined },
    });
    await tx.applicationStatusHistory.create({
      data: { applicationId, fromStatus: application.status, toStatus: status, changedById: actorId, reason },
    });
    await tx.notification.create({
      data: {
        userId: application.userId,
        applicationId,
        type: status === "CHANGES_REQUESTED" ? "CHANGES_REQUESTED" : "APPLICATION_STATUS",
        title: "Application status updated",
        body: `Your application is now ${status.toLowerCase().replaceAll("_", " ")}.`,
        href: `/applications/${applicationId}`,
      },
    });
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
