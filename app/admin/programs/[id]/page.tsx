import { db } from "@/lib/db";
import { Badge, ButtonLink, Metric, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";
export default async function ProgramOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
      <div className="panel overview-next">
        <div>
          <p className="eyebrow">Next step</p>
          <h2>
            {program.form?.versions[0]?.status === "PUBLISHED"
              ? "Registration form is published"
              : "Build the application form"}
          </h2>
          <p>
            {program.form?.versions[0]?.status === "PUBLISHED"
              ? `Version ${program.form.versions[0].version} is accepting responses.`
              : "Add sections and fields, preview the experience, then publish an immutable version."}
          </p>
        </div>
        <ButtonLink href={`/admin/programs/${id}/form`}>
          {program.form?.versions[0]?.status === "PUBLISHED" ? "Manage form" : "Build form"}
        </ButtonLink>
      </div>
    </>
  );
}
