import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import { assertDeadline, assertTeamSize, canEditSubmitted, submissionStatus } from "@/lib/domain/program";
import { validateDynamicAnswers } from "@/lib/validation/dynamic-form";

function referenceId(program: { slug: string; startAt: Date | null }) {
  const prefix = program.slug
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 4)
    .toUpperCase()
    .padEnd(3, "X");
  const year = (program.startAt ?? new Date()).getFullYear();
  return `${prefix}-${year}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function startApplication(programId: string, userId: string) {
  const program = await db.program.findUnique({
    where: { id: programId, archivedAt: null },
    include: {
      form: { include: { versions: { where: { status: "PUBLISHED" }, orderBy: { version: "desc" }, take: 1 } } },
      stages: { orderBy: { order: "asc" }, take: 1 },
    },
  });
  if (!program) throw notFound("Program");
  assertDeadline(program);
  if (program.allowedEmailDomains.length) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
    const domain = user?.email.split("@").at(-1)?.toLowerCase();
    const allowed = program.allowedEmailDomains.map((item) => item.trim().replace(/^@/, "").toLowerCase());
    if (!domain || !allowed.includes(domain))
      throw new AppError("Your email domain is not eligible for this program", 403, "EMAIL_DOMAIN_RESTRICTED");
  }
  const version = program.form?.versions[0];
  if (!version) throw new AppError("This program does not have a published form", 409, "FORM_NOT_PUBLISHED");
  return db.application.upsert({
    where: { programId_userId: { programId, userId } },
    update: {},
    create: {
      referenceId: referenceId(program),
      programId,
      userId,
      formVersionId: version.id,
      stageId: program.stages[0]?.id,
    },
  });
}

export async function saveDraft(applicationId: string, userId: string, answers: Record<string, unknown>) {
  const application = await db.application.findUnique({
    where: { id: applicationId, userId },
    include: { program: true, formVersion: { include: { sections: { include: { fields: true } } } } },
  });
  if (!application) throw notFound("Application");
  if (
    application.status !== "DRAFT" &&
    application.status !== "CHANGES_REQUESTED" &&
    !canEditSubmitted(application.program, application.editOverrideUntil)
  ) {
    throw new AppError("This application can no longer be edited", 409, "EDIT_LOCKED");
  }
  const fields = application.formVersion.sections.flatMap((section) => section.fields);
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const operations = Object.entries(answers)
    .filter(([key]) => byKey.has(key))
    .map(([key, value]) => {
      const field = byKey.get(key)!;
      return db.applicationAnswer.upsert({
        where: { applicationId_fieldId: { applicationId, fieldId: field.id } },
        create: { applicationId, fieldId: field.id, value: value as never },
        update: { value: value as never },
      });
    });
  await db.$transaction([
    ...operations,
    db.application.update({ where: { id: applicationId }, data: { lastSavedAt: new Date() } }),
  ]);
  return { savedAt: new Date() };
}

export async function submitApplication(applicationId: string, userId: string) {
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`application:${applicationId}`}))`;
      const application = await tx.application.findUnique({
        where: { id: applicationId, userId },
        include: {
          program: true,
          user: { select: { email: true } },
          team: { include: { members: true } },
          answers: { include: { field: true } },
          files: true,
          formVersion: { include: { sections: { include: { fields: true } } } },
        },
      });
      if (!application) throw notFound("Application");
      if (!["DRAFT", "CHANGES_REQUESTED"].includes(application.status))
        throw new AppError("Application has already been submitted", 409, "ALREADY_SUBMITTED");
      assertDeadline(application.program);
      const members = application.team?.members.length ?? 1;
      assertTeamSize(
        application.program.participationMode,
        application.program.teamMinSize,
        application.program.teamMaxSize,
        members,
      );
      const answers = Object.fromEntries(application.answers.map(({ field, value }) => [field.key, value]));
      const fields = application.formVersion.sections.flatMap((section) => section.fields);
      const issues = validateDynamicAnswers(fields, answers);
      for (const field of fields.filter((item) => item.type === "FILE" && item.required)) {
        if (!application.files.some((file) => file.fieldId === field.id && !file.deletedAt))
          issues[field.key] = `${field.label} is required`;
      }
      if (Object.keys(issues).length)
        throw new AppError("Please complete all required fields", 422, "VALIDATION_ERROR", issues);

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`program-capacity:${application.programId}`}))`;
      const countedStatuses = [
        "SUBMITTED",
        "UNDER_REVIEW",
        "SHORTLISTED",
        "SELECTED",
        "APPROVED",
        "CONFIRMED",
      ] as const;
      const submittedCount = await tx.application.count({
        where: { programId: application.programId, status: { in: [...countedStatuses] } },
      });
      const nextStatus = submissionStatus({
        requiresReview: application.program.requiresReview,
        capacity: application.program.capacity,
        currentCount: submittedCount,
        waitlistEnabled: application.program.waitlistEnabled,
      });
      const snapshot = {
        answers,
        team: application.team,
        files: application.files.map(({ id, fieldId, originalFilename, mimeType, size }) => ({
          id,
          fieldId,
          originalFilename,
          mimeType,
          size,
        })),
      };
      const revision = await tx.applicationRevision.count({ where: { applicationId } });
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: { status: nextStatus, submittedAt: new Date(), lastSavedAt: new Date() },
      });
      await tx.applicationRevision.create({
        data: {
          applicationId,
          revision: revision + 1,
          snapshot,
          reason: application.status === "CHANGES_REQUESTED" ? "Resubmission" : "Initial submission",
        },
      });
      await tx.applicationStatusHistory.create({
        data: { applicationId, fromStatus: application.status, toStatus: nextStatus, changedById: userId },
      });
      await tx.notification.create({
        data: {
          userId,
          applicationId,
          type: "APPLICATION_STATUS",
          title:
            nextStatus === "WAITLISTED"
              ? "Added to waitlist"
              : nextStatus === "CONFIRMED"
                ? "Registration confirmed"
                : "Application submitted",
          body: `${application.referenceId} has been received.`,
          href: `/applications/${applicationId}`,
        },
      });
      await tx.emailDelivery.create({
        data: {
          programId: application.programId,
          recipientEmail: application.user.email,
          templateKey: nextStatus === "CONFIRMED" ? "registration.confirmed" : "application.submitted",
          subject:
            nextStatus === "CONFIRMED"
              ? `${application.program.name}: registration confirmed`
              : `${application.program.name}: application received`,
          textBody:
            nextStatus === "CONFIRMED"
              ? `${application.referenceId} is confirmed. Sign in to Ruminate Portal for program details.`
              : `${application.referenceId} has been received. Sign in to Ruminate Portal to track its status.`,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          programId: application.programId,
          action: "application.submit",
          entityType: "Application",
          entityId: applicationId,
          metadata: { referenceId: application.referenceId },
        },
      });
      return updated;
    },
    { isolationLevel: "Serializable" },
  );
}
