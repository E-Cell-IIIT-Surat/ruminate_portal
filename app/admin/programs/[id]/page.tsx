import { db } from "@/lib/db";
import { Badge, Metric, PageHeader } from "@/components/ui";
import { ProgramLaunchChecklist } from "@/components/program-launch-checklist";
import { requirePermission } from "@/lib/authz";

export const dynamic = "force-dynamic";
export default async function ProgramOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("application:view", id);
  const program = await db.program.findUnique({
    where: { id },
    include: {
      _count: { select: { applications: true, managers: true } },
      form: { include: { versions: { orderBy: { version: "desc" }, take: 1 } } },
      stages: true,
      rubrics: true,
    },
  });
  if (!program) return <PageHeader title="Program not found" />;
  const submitted = await db.application.count({ where: { programId: id, status: { not: "DRAFT" } } });
  return (
    <>
      <PageHeader
        eyebrow={program.type.replaceAll("_", " ")}
        title={program.name}
        description={program.shortDescription}
        action={
          <Badge tone={program.status === "REGISTRATION_OPEN" ? "green" : "neutral"}>
            {program.status.replaceAll("_", " ")}
          </Badge>
        }
      />
      <nav className="tabs">
        <a className="active" href={`/admin/programs/${id}`}>
          Overview
        </a>
        <a href={`/admin/programs/${id}/form`}>Form</a>
        <a href={`/admin/programs/${id}/applications`}>Applications</a>
        <a href={`/admin/programs/${id}/stages`}>Stages</a>
        <a href={`/admin/programs/${id}/reviewers`}>Reviewers</a>
        <a href={`/admin/programs/${id}/evaluation`}>Evaluation</a>
        <a href={`/admin/programs/${id}/announcements`}>Announcements</a>
        <a href={`/admin/programs/${id}/analytics`}>Analytics</a>
        <a href={`/admin/programs/${id}/settings`}>Settings</a>
      </nav>
      <div className="metric-grid">
        <Metric label="Applications" value={program._count.applications} />
        <Metric label="Submitted" value={submitted} />
        <Metric label="Stages" value={program.stages.length} />
        <Metric label="Rubrics" value={program.rubrics.length} />
      </div>
      <ProgramLaunchChecklist
        programId={id}
        status={program.status}
        formPublished={program.form?.versions[0]?.status === "PUBLISHED"}
        formVersion={program.form?.versions[0]?.version}
      />
    </>
  );
}
