import { StageEditor } from "@/components/program-config-editors";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function StagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const program = await db.program.findUnique({ where: { id }, include: { stages: { orderBy: { order: "asc" } } } });
  return (
    <>
      <PageHeader
        eyebrow={program?.name}
        title="Program stages"
        description="Configure application, review, revision, shortlist, and final rounds."
      />
      <StageEditor
        programId={id}
        initial={program?.stages.map(({ name, description }) => ({ name, description })) ?? []}
      />
    </>
  );
}
