import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import { assertDeadline, assertTeamSize, canEditSubmitted, submissionStatus } from "@/lib/domain/program";
import { validateDynamicAnswers } from "@/lib/validation/dynamic-form";
import { Prisma, type PrismaClient } from "@prisma/client";
import { retryTransaction } from "@/lib/services/transaction-retry";

async function writeAnswers(
  tx: Prisma.TransactionClient,
  applicationId: string,
  fields: { id: string; key: string; type: string }[],
  answers: Record<string, unknown>,
) {
  const data = fields
    .filter((field) => !["FILE", "HEADING", "HELP_TEXT"].includes(field.type) && Object.hasOwn(answers, field.key))
    .map((field) => ({
      applicationId,
      fieldId: field.id,
      value: answers[field.key] == null ? Prisma.JsonNull : (answers[field.key] as Prisma.InputJsonValue),
    }));
  if (!data.length) return;
  await tx.applicationAnswer.deleteMany({
    where: { applicationId, fieldId: { in: data.map((item) => item.fieldId) } },
  });
  await tx.applicationAnswer.createMany({ data });
}

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

export async function saveDraft(
  applicationId: string,
  userId: string,
  answers: Record<string, unknown>,
  client: Pick<PrismaClient, "$transaction"> = db,
) {
  return client.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`application:${applicationId}`}))`;
      const application = await tx.application.findUnique({
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
      await writeAnswers(tx, applicationId, fields, answers);
      await tx.application.update({ where: { id: applicationId }, data: { lastSavedAt: new Date() } });
      return { savedAt: new Date() };
    },
    { maxWait: 5000, timeout: 20000 },
  );
}

export async function submitApplication(
  applicationId: string,
  userId: string,
  finalAnswers?: Record<string, unknown>,
  client: Pick<PrismaClient, "$transaction" | "notification" | "emailDelivery"> = db,
) {
  const result = await retryTransaction(() =>
    client.$transaction(
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
        const fields = application.formVersion.sections.flatMap((section) => section.fields);
        const answers: Record<string, unknown> = Object.fromEntries(
          application.answers.map(({ field, value }) => [field.key, value]),
        );
        for (const field of fields)
          if (finalAnswers && Object.hasOwn(finalAnswers, field.key)) answers[field.key] = finalAnswers[field.key];
        const issues = validateDynamicAnswers(fields, answers, application.files);
        if (application.program.participationMode === "TEAM" && !application.team)
          issues.team = "Save your team details below the form before submitting.";
        if (Object.keys(issues).length)
          throw new AppError("Please correct the highlighted answers", 422, "VALIDATION_ERROR", issues);

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
        const snapshot = JSON.parse(
          JSON.stringify({
            answers,
            team: application.team,
            files: application.files
              .filter((file) => !file.deletedAt)
              .map(({ id, fieldId, originalFilename, mimeType, size }) => ({
                id,
                fieldId,
                originalFilename,
                mimeType,
                size,
              })),
          }),
        ) as Prisma.InputJsonObject;
        if (finalAnswers) await writeAnswers(tx, applicationId, fields, finalAnswers);
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
        return {
          application: updated,
          userId,
          applicationId,
          programId: application.programId,
          recipientEmail: application.user.email,
          programName: application.program.name,
          referenceId: application.referenceId,
          nextStatus,
        };
      },
      { isolationLevel: "Serializable", maxWait: 5000, timeout: 20000 },
    ),
  );
  // Notifications and email delivery are deliberately best-effort. A provider
  // or auxiliary table outage must never undo a valid application submission.
  try {
    await client.notification.create({
      data: {
        userId: result.userId,
        applicationId: result.applicationId,
        type: "APPLICATION_STATUS",
        title:
          result.nextStatus === "WAITLISTED"
            ? "Added to waitlist"
            : result.nextStatus === "CONFIRMED"
              ? "Registration confirmed"
              : "Application submitted",
        body: `${result.referenceId} has been received.`,
        href: `/applications/${result.applicationId}`,
      },
    });
  } catch (error) {
    console.error("[application notification failed]", { applicationId: result.applicationId, error });
  }
  let emailDeliveryId: string | null = null;
  try {
    const delivery = await client.emailDelivery.create({
      data: {
        programId: result.programId,
        recipientEmail: result.recipientEmail,
        templateKey: result.nextStatus === "CONFIRMED" ? "registration.confirmed" : "application.submitted",
        subject:
          result.nextStatus === "CONFIRMED"
            ? `${result.programName}: registration confirmed`
            : `${result.programName}: application received`,
        textBody:
          result.nextStatus === "CONFIRMED"
            ? `${result.referenceId} is confirmed. Sign in to Ruminate Portal for program details.`
            : `${result.referenceId} has been received. Sign in to Ruminate Portal to track its status.`,
      },
    });
    emailDeliveryId = delivery.id;
  } catch (error) {
    console.error("[application email queue failed]", { applicationId: result.applicationId, error });
  }
  return { application: result.application, emailDeliveryId };
}
