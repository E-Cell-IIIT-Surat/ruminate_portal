import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError, notFound, safeError } from "@/lib/errors";
import { programActionInput, programSettingsInput } from "@/lib/validation/program-settings";

const transitions: Record<string, string[]> = {
  DRAFT: ["PUBLISHED", "REGISTRATION_OPEN", "ARCHIVED"],
  PUBLISHED: ["DRAFT", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "ARCHIVED"],
  REGISTRATION_OPEN: ["REGISTRATION_CLOSED", "IN_PROGRESS", "ARCHIVED"],
  REGISTRATION_CLOSED: ["REGISTRATION_OPEN", "IN_PROGRESS", "COMPLETED", "ARCHIVED"],
  IN_PROGRESS: ["REGISTRATION_OPEN", "COMPLETED", "ARCHIVED"],
  COMPLETED: ["IN_PROGRESS", "ARCHIVED"],
  ARCHIVED: ["DRAFT"],
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requirePermission("program:update", id);
    const input = programSettingsInput.parse(await request.json());
    const existing = await db.program.findUnique({
      where: { id },
      include: { form: { include: { versions: { where: { status: "PUBLISHED" }, take: 1 } } } },
    });
    if (!existing) throw notFound("Program");
    const merged = { ...existing, ...input };
    if (
      merged.registrationOpenAt &&
      merged.registrationCloseAt &&
      merged.registrationOpenAt >= merged.registrationCloseAt
    )
      throw new AppError("Registration closing time must be after opening time", 422, "INVALID_DATES");
    if (merged.startAt && merged.endAt && merged.startAt >= merged.endAt)
      throw new AppError("Program end time must be after its start time", 422, "INVALID_DATES");
    if (merged.teamMinSize > merged.teamMaxSize)
      throw new AppError("Maximum team size must be at least the minimum", 422, "INVALID_TEAM_SIZE");
    if (input.status && input.status !== existing.status) {
      if (!transitions[existing.status]?.includes(input.status))
        throw new AppError(`Cannot move ${existing.status} to ${input.status}`, 409, "INVALID_TRANSITION");
      if (["PUBLISHED", "REGISTRATION_OPEN"].includes(input.status) && !existing.form?.versions.length)
        throw new AppError("Publish the application form before opening registration", 409, "FORM_NOT_PUBLISHED");
    }
    const program = await db.$transaction(async (tx) => {
      const updated = await tx.program.update({
        where: { id },
        data: {
          ...input,
          archivedAt: input.status === "ARCHIVED" ? new Date() : input.status === "DRAFT" ? null : undefined,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          programId: id,
          action:
            input.status && input.status !== existing.status ? "program.status.update" : "program.settings.update",
          entityType: "Program",
          entityId: id,
          metadata: { changed: Object.keys(input), fromStatus: existing.status, toStatus: input.status },
        },
      });
      return updated;
    });
    return Response.json({ program });
  } catch (error) {
    return safeError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const action = programActionInput.parse(await request.json());
    const actor = await requirePermission("program:update", id);
    if (action.action === "set_status") {
      const existing = await db.program.findUnique({
        where: { id },
        include: { form: { include: { versions: { where: { status: "PUBLISHED" }, take: 1 } } } },
      });
      if (!existing) throw notFound("Program");
      if (action.status === existing.status) return Response.json({ program: existing });
      if (!transitions[existing.status]?.includes(action.status))
        throw new AppError(`Cannot move ${existing.status} to ${action.status}`, 409, "INVALID_TRANSITION");
      if (["PUBLISHED", "REGISTRATION_OPEN"].includes(action.status) && !existing.form?.versions.length)
        throw new AppError("Publish the application form before opening registration", 409, "FORM_NOT_PUBLISHED");
      const program = await db.$transaction(async (tx) => {
        const updated = await tx.program.update({
          where: { id },
          data: {
            status: action.status,
            archivedAt: action.status === "ARCHIVED" ? new Date() : action.status === "DRAFT" ? null : undefined,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            programId: id,
            action: "program.status.update",
            entityType: "Program",
            entityId: id,
            metadata: { changed: ["status"], fromStatus: existing.status, toStatus: action.status },
          },
        });
        return updated;
      });
      return Response.json({ program });
    }
    if (action.action === "publish_results") {
      const publication = await db.program.findUnique({ where: { id }, select: { resultsPublishedAt: true } });
      if (!publication) throw notFound("Program");
      if (publication.resultsPublishedAt)
        throw new AppError("Results have already been published", 409, "RESULTS_ALREADY_PUBLISHED");
      const decisions = await db.application.findMany({
        where: { programId: id, status: { in: ["SELECTED", "REJECTED", "APPROVED", "CONFIRMED"] } },
        select: { id: true, userId: true, status: true, user: { select: { email: true } } },
      });
      const program = await db.$transaction(async (tx) => {
        const updated = await tx.program.update({ where: { id }, data: { resultsPublishedAt: new Date() } });
        if (decisions.length) {
          await tx.notification.createMany({
            data: decisions.map((item) => ({
              userId: item.userId,
              applicationId: item.id,
              type: "APPLICATION_STATUS",
              title: "Program result published",
              body: `Your application is ${item.status.toLowerCase().replaceAll("_", " ")}.`,
              href: `/applications/${item.id}`,
            })),
          });
          await tx.emailDelivery.createMany({
            data: decisions.map((item) => ({
              programId: id,
              recipientEmail: item.user.email,
              templateKey: "results.published",
              subject: `${updated.name}: results published`,
              textBody: "Your result is now available. Sign in to Ruminate Portal to view it.",
            })),
          });
        }
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            programId: id,
            action: "program.results.publish",
            entityType: "Program",
            entityId: id,
            metadata: { decisions: decisions.length },
          },
        });
        return updated;
      });
      return Response.json({ program });
    }

    await requirePermission("program:create");
    const source = await db.program.findUnique({
      where: { id },
      include: {
        stages: { orderBy: { order: "asc" } },
        rubrics: { include: { criteria: { orderBy: { order: "asc" } } } },
        form: {
          include: {
            versions: {
              orderBy: { version: "desc" },
              take: 1,
              include: {
                sections: {
                  orderBy: { order: "asc" },
                  include: { fields: { orderBy: { order: "asc" } } },
                },
              },
            },
          },
        },
      },
    });
    if (!source) throw notFound("Program");
    const duplicate = await db.$transaction(async (tx) => {
      const created = await tx.program.create({
        data: {
          slug: action.slug,
          name: action.name,
          shortDescription: source.shortDescription,
          description: source.description,
          eligibility: source.eligibility,
          instructions: source.instructions,
          type: source.type,
          visibility: source.visibility,
          capacity: source.capacity,
          waitlistEnabled: source.waitlistEnabled,
          participationMode: source.participationMode,
          teamMinSize: source.teamMinSize,
          teamMaxSize: source.teamMaxSize,
          requiresReview: source.requiresReview,
          allowsDrafts: source.allowsDrafts,
          allowsEditAfterSubmit: source.allowsEditAfterSubmit,
          allowsWithdrawal: source.allowsWithdrawal,
          requiresAuth: source.requiresAuth,
          allowedEmailDomains: source.allowedEmailDomains,
          blindReview: source.blindReview,
          createdById: actor.id,
        },
      });
      await tx.programManager.create({ data: { programId: created.id, userId: actor.id } });
      const stageIds = new Map<string, string>();
      for (const stage of source.stages) {
        const copied = await tx.programStage.create({
          data: {
            programId: created.id,
            name: stage.name,
            description: stage.description,
            order: stage.order,
            isInitial: stage.isInitial,
            isTerminal: stage.isTerminal,
          },
        });
        stageIds.set(stage.id, copied.id);
      }
      const form = await tx.form.create({ data: { programId: created.id, name: `${created.name} application` } });
      const sourceVersion = source.form?.versions[0];
      if (sourceVersion) {
        const version = await tx.formVersion.create({
          data: { formId: form.id, version: 1, status: "DRAFT", changelog: `Copied from ${source.name}` },
        });
        for (const section of sourceVersion.sections) {
          const copiedSection = await tx.formSection.create({
            data: {
              formVersionId: version.id,
              title: section.title,
              description: section.description,
              order: section.order,
            },
          });
          for (const field of section.fields)
            await tx.formField.create({
              data: {
                sectionId: copiedSection.id,
                key: field.key,
                type: field.type,
                label: field.label,
                description: field.description,
                helpText: field.helpText,
                placeholder: field.placeholder,
                required: field.required,
                hideFromReviewers: field.hideFromReviewers,
                minLength: field.minLength,
                maxLength: field.maxLength,
                minNumber: field.minNumber,
                maxNumber: field.maxNumber,
                options: field.options ?? undefined,
                allowedFileTypes: field.allowedFileTypes,
                maxFileSizeBytes: field.maxFileSizeBytes,
                conditionFieldKey: field.conditionFieldKey,
                conditionOperator: field.conditionOperator,
                conditionValue: field.conditionValue ?? undefined,
                order: field.order,
              },
            });
        }
      }
      for (const rubric of source.rubrics)
        await tx.rubric.create({
          data: {
            programId: created.id,
            stageId: rubric.stageId ? stageIds.get(rubric.stageId) : undefined,
            name: rubric.name,
            description: rubric.description,
            active: rubric.active,
            criteria: {
              create: rubric.criteria.map((criterion) => ({
                name: criterion.name,
                description: criterion.description,
                maxScore: criterion.maxScore,
                weight: criterion.weight,
                order: criterion.order,
              })),
            },
          },
        });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          programId: created.id,
          action: "program.duplicate",
          entityType: "Program",
          entityId: created.id,
          metadata: { sourceProgramId: id },
        },
      });
      return created;
    });
    return Response.json({ program: duplicate }, { status: 201 });
  } catch (error) {
    return safeError(error);
  }
}
