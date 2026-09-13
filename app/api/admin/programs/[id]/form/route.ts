import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError, safeError } from "@/lib/errors";
import { formBuilderInput, formBuilderIssues } from "@/lib/validation/form-builder";
import { z } from "zod";
import { Prisma } from "@prisma/client";

function builderError(error: unknown) {
  if (error instanceof z.ZodError) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        route: "/api/admin/programs/[id]/form",
        code: "VALIDATION_ERROR",
        issues: formBuilderIssues(error),
      }),
    );
    return Response.json(
      { error: "Please check the listed form fields", code: "VALIDATION_ERROR", issues: formBuilderIssues(error) },
      { status: 422 },
    );
  }
  return safeError(error, { route: "/api/admin/programs/[id]/form" });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: programId } = await params;
    const actor = await requirePermission("form:manage", programId);
    const body = await request.json();
    const { publish } = z.object({ publish: z.boolean().default(false) }).parse(body);
    const input = formBuilderInput.parse(body);
    if (publish && input.sections.every((section) => section.fields.length === 0))
      throw new AppError("Add at least one field before publishing", 422);
    const version = await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`program-form:${programId}`}))`;
        const form = await tx.form.findUnique({
          where: { programId },
          include: { versions: { orderBy: { version: "desc" }, take: 1 } },
        });
        if (!form) throw new AppError("Form not found", 404);
        const latest = form.versions[0];
        const target =
          latest?.status === "DRAFT"
            ? latest
            : await tx.formVersion.create({ data: { formId: form.id, version: (latest?.version ?? 0) + 1 } });
        if (latest?.status === "DRAFT") await tx.formSection.deleteMany({ where: { formVersionId: target.id } });
        for (const [sectionIndex, section] of input.sections.entries()) {
          const createdSection = await tx.formSection.create({
            data: {
              formVersionId: target.id,
              title: section.title,
              description: section.description,
              order: sectionIndex + 1,
            },
          });
          if (section.fields.length) {
            await tx.formField.createMany({
              data: section.fields.map((item, fieldIndex) => ({
                sectionId: createdSection.id,
                key: item.key,
                type: item.type,
                label: item.label,
                description: item.description,
                helpText: item.helpText,
                placeholder: item.placeholder,
                required: item.required,
                hideFromReviewers: item.hideFromReviewers,
                minLength: item.minLength,
                maxLength: item.maxLength,
                minNumber: item.minNumber,
                maxNumber: item.maxNumber,
                options: item.options,
                allowedFileTypes: item.allowedFileTypes,
                maxFileSizeBytes: item.maxFileSizeBytes,
                conditionFieldKey: item.conditionFieldKey,
                conditionOperator: item.conditionOperator,
                conditionValue:
                  item.conditionValue == null ? Prisma.DbNull : (item.conditionValue as Prisma.InputJsonValue),
                order: fieldIndex + 1,
              })),
            });
          }
        }
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            programId,
            action: "form.draft.save",
            entityType: "FormVersion",
            entityId: target.id,
            metadata: { version: target.version },
          },
        });
        if (publish) {
          await tx.formVersion.updateMany({
            where: { formId: form.id, status: "PUBLISHED", id: { not: target.id } },
            data: { status: "RETIRED" },
          });
          const published = await tx.formVersion.update({
            where: { id: target.id },
            data: { status: "PUBLISHED", publishedAt: new Date(), publishedById: actor.id },
          });
          await tx.auditLog.create({
            data: {
              actorId: actor.id,
              programId,
              action: "form.publish",
              entityType: "FormVersion",
              entityId: target.id,
              metadata: { version: target.version },
            },
          });
          return published;
        }
        return target;
      },
      { maxWait: 5000, timeout: 20000 },
    );
    return Response.json({ version });
  } catch (error) {
    return builderError(error);
  }
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: programId } = await params;
    const actor = await requirePermission("form:manage", programId);
    const version = await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`program-form:${programId}`}))`;
        const form = await tx.form.findUnique({
          where: { programId },
          include: {
            versions: {
              where: { status: "DRAFT" },
              orderBy: { version: "desc" },
              take: 1,
              include: { sections: { include: { fields: true } } },
            },
          },
        });
        const draft = form?.versions[0];
        if (!draft || draft.sections.length === 0 || draft.sections.every((section) => section.fields.length === 0))
          throw new AppError("Add at least one field before publishing", 422);
        formBuilderInput.parse({
          sections: draft.sections.map((section) => ({
            title: section.title,
            description: section.description ?? undefined,
            fields: section.fields.map((field) => ({
              ...field,
              description: field.description ?? undefined,
              helpText: field.helpText ?? undefined,
              placeholder: field.placeholder ?? undefined,
              options: field.options ?? undefined,
              minNumber: field.minNumber?.toNumber() ?? null,
              maxNumber: field.maxNumber?.toNumber() ?? null,
            })),
          })),
        });
        await tx.formVersion.updateMany({
          where: { formId: draft.formId, status: "PUBLISHED", id: { not: draft.id } },
          data: { status: "RETIRED" },
        });
        const published = await tx.formVersion.update({
          where: { id: draft.id },
          data: { status: "PUBLISHED", publishedAt: new Date(), publishedById: actor.id },
        });
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            programId,
            action: "form.publish",
            entityType: "FormVersion",
            entityId: draft.id,
            metadata: { version: draft.version },
          },
        });
        return published;
      },
      { maxWait: 5000, timeout: 20000 },
    );
    return Response.json({ version });
  } catch (error) {
    return builderError(error);
  }
}
