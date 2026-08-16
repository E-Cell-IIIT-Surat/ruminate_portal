import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";
import { formBuilderInput } from "@/lib/validation/form-builder";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: programId } = await params;
    const actor = await requirePermission("form:manage", programId);
    const input = formBuilderInput.parse(await request.json());
    const form = await db.form.findUnique({
      where: { programId },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (!form) return Response.json({ error: "Form not found" }, { status: 404 });
    const latest = form.versions[0];
    const version = await db.$transaction(async (tx) => {
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
        for (const [fieldIndex, item] of section.fields.entries()) {
          await tx.formField.create({
            data: {
              sectionId: createdSection.id,
              key: item.key,
              type: item.type,
              label: item.label,
              description: item.description,
              helpText: item.helpText,
              placeholder: item.placeholder,
              required: item.required,
              minLength: item.minLength,
              maxLength: item.maxLength,
              minNumber: item.minNumber,
              maxNumber: item.maxNumber,
              options: item.options,
              allowedFileTypes: item.allowedFileTypes,
              maxFileSizeBytes: item.maxFileSizeBytes,
              conditionFieldKey: item.conditionFieldKey,
              conditionOperator: item.conditionOperator,
              conditionValue: item.conditionValue as never,
              order: fieldIndex + 1,
            },
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
      return target;
    });
    return Response.json({ version });
  } catch (error) {
    return safeError(error);
  }
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: programId } = await params;
    const actor = await requirePermission("form:manage", programId);
    const form = await db.form.findUnique({
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
      return Response.json({ error: "Add at least one field before publishing" }, { status: 422 });
    const version = await db.$transaction(async (tx) => {
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
    });
    return Response.json({ version });
  } catch (error) {
    return safeError(error);
  }
}
