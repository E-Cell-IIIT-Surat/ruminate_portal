import { FormBuilder } from "@/components/form-builder";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export default async function ProgramFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
        description: field.description ?? undefined,
        helpText: field.helpText ?? undefined,
        placeholder: field.placeholder ?? undefined,
        options: Array.isArray(field.options) ? field.options.map(String) : undefined,
        allowedFileTypes: field.allowedFileTypes,
        maxFileSizeBytes: field.maxFileSizeBytes,
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
