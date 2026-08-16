import { FormBuilder } from "@/components/form-builder";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/authz";

export const dynamic = "force-dynamic";
export default async function ProgramFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("form:manage", id);
  const program = await db.program.findUnique({
    where: { id },
    include: {
      form: {
        include: {
          versions: {
            orderBy: { version: "desc" },
            take: 1,
            include: { sections: { orderBy: { order: "asc" }, include: { fields: { orderBy: { order: "asc" } } } } },
          },
        },
      },
    },
  });
  if (!program) return <PageHeader title="Program not found" />;
  const latest = program.form?.versions[0];
  const initial =
    latest?.sections.map((section) => ({
      title: section.title,
      description: section.description ?? undefined,
      fields: section.fields.map((field) => ({
        key: field.key,
        label: field.label,
        type: field.type,
        required: field.required,
        hideFromReviewers: field.hideFromReviewers,
        description: field.description ?? undefined,
        helpText: field.helpText ?? undefined,
        placeholder: field.placeholder ?? undefined,
        options: Array.isArray(field.options) ? field.options.map(String) : undefined,
        allowedFileTypes: field.allowedFileTypes,
        maxFileSizeBytes: field.maxFileSizeBytes,
        minLength: field.minLength,
        maxLength: field.maxLength,
        minNumber: field.minNumber?.toNumber() ?? null,
        maxNumber: field.maxNumber?.toNumber() ?? null,
        conditionFieldKey: field.conditionFieldKey,
        conditionOperator: field.conditionOperator as "==" | "!=" | null,
        conditionValue: field.conditionValue,
      })),
    })) ?? [];
  return (
    <>
      <PageHeader
        eyebrow={`${program.name} · Form`}
        title="Form builder"
        description={
          latest
            ? `${latest.status.toLowerCase()} version ${latest.version}. Published versions remain immutable.`
            : "Create sections and fields without developer involvement."
        }
      />
      <FormBuilder programId={id} initial={initial} />
    </>
  );
}
