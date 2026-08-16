import { RubricEditor } from "@/components/program-config-editors";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function EvaluationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const program = await db.program.findUnique({
    where: { id },
    include: { stages: { orderBy: { order: "asc" } }, rubrics: { include: { criteria: true, stage: true } } },
  });
  return (
    <>
      <PageHeader
        eyebrow={program?.name}
        title="Evaluation rubrics"
        description="Create stage-specific weighted scoring without event-specific code."
      />
      <RubricEditor programId={id} stages={program?.stages ?? []} />
      {program?.rubrics.map((rubric) => (
        <div className="panel" key={rubric.id}>
          <div className="panel-header">
            <h2>{rubric.name}</h2>
            <span>{rubric.stage?.name ?? "All stages"}</span>
          </div>
          <div className="compact-list">
            {rubric.criteria.map((item) => (
              <div key={item.id}>
                <strong>{item.name}</strong>
                <small>
                  Maximum {item.maxScore.toNumber()} · Weight {item.weight.toNumber()}
                </small>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
