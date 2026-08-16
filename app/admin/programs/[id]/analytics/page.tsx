import { Metric, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/authz";

export const dynamic = "force-dynamic";

type CountRow = { label: string; count: bigint };
type ReviewerRow = { label: string; assigned: bigint; completed: bigint };

function Distribution({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return (
    <div className="panel status-bars">
      <div className="panel-header"><h2>{title}</h2></div>
      {rows.length ? rows.map((row) => (
        <div key={row.label}>
          <span>{row.label}</span>
          <i><b style={{ width: `${total ? (row.count / total) * 100 : 0}%` }} /></i>
          <strong>{row.count}</strong>
        </div>
      )) : <p className="config-state">No data yet.</p>}
    </div>
  );
}

export default async function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("application:view", id);
  const [program, grouped, stageGrouped, colleges, daily, reviewers] = await Promise.all([
    db.program.findUnique({ where: { id }, select: { name: true } }),
    db.application.groupBy({ by: ["status"], where: { programId: id }, _count: { _all: true } }),
    db.application.groupBy({ by: ["stageId"], where: { programId: id }, _count: { _all: true } }),
    db.$queryRaw<CountRow[]>`
      SELECT COALESCE(NULLIF(TRIM(u."institution"), ''), 'Not provided') AS label, COUNT(*)::bigint AS count
      FROM "Application" a
      JOIN "User" u ON u."id" = a."userId"
      WHERE a."programId" = ${id}
      GROUP BY label
      ORDER BY count DESC
      LIMIT 12
    `,
    db.$queryRaw<CountRow[]>`
      SELECT TO_CHAR(DATE_TRUNC('day', "submittedAt"), 'DD Mon YYYY') AS label, COUNT(*)::bigint AS count
      FROM "Application"
      WHERE "programId" = ${id} AND "submittedAt" IS NOT NULL
      GROUP BY DATE_TRUNC('day', "submittedAt")
      ORDER BY DATE_TRUNC('day', "submittedAt") DESC
      LIMIT 30
    `,
    db.$queryRaw<ReviewerRow[]>`
      SELECT COALESCE(u."name", u."email") AS label,
             COUNT(ra."id")::bigint AS assigned,
             COUNT(ra."id") FILTER (WHERE ra."status" = 'COMPLETED')::bigint AS completed
      FROM "ReviewerAssignment" ra
      JOIN "Application" a ON a."id" = ra."applicationId"
      JOIN "User" u ON u."id" = ra."reviewerId"
      WHERE a."programId" = ${id}
      GROUP BY u."id", u."name", u."email"
      ORDER BY assigned DESC
    `,
  ]);
  const stageIds = stageGrouped.map((item) => item.stageId).filter((stageId): stageId is string => Boolean(stageId));
  const stages = stageIds.length
    ? await db.programStage.findMany({ where: { id: { in: stageIds } }, select: { id: true, name: true } })
    : [];
  const stageNames = new Map(stages.map((stage) => [stage.id, stage.name]));
  const total = grouped.reduce((sum, item) => sum + item._count._all, 0);
  const value = (status: string) => grouped.find((item) => item.status === status)?._count._all ?? 0;
  return (
    <>
      <PageHeader
        eyebrow={program?.name}
        title="Program analytics"
        description="Live aggregated application, stage, college, and reviewer data."
        action={<a className="button button-secondary" href={`/api/admin/programs/${id}/export`}>Export CSV</a>}
      />
      <div className="metric-grid">
        <Metric label="Applications" value={total} />
        <Metric label="Submitted" value={value("SUBMITTED")} />
        <Metric label="Under review" value={value("UNDER_REVIEW")} />
        <Metric label="Selected / approved" value={value("SELECTED") + value("APPROVED")} />
      </div>
      <div className="analytics-grid">
        <Distribution title="Status distribution" rows={grouped.map((item) => ({ label: item.status.replaceAll("_", " "), count: item._count._all }))} />
        <Distribution title="Stage distribution" rows={stageGrouped.map((item) => ({ label: item.stageId ? (stageNames.get(item.stageId) ?? "Unknown") : "No stage", count: item._count._all }))} />
        <Distribution title="College distribution" rows={colleges.map((row) => ({ label: row.label, count: Number(row.count) }))} />
        <Distribution title="Applications over time" rows={[...daily].reverse().map((row) => ({ label: row.label, count: Number(row.count) }))} />
      </div>
      <div className="panel table-wrap">
        <div className="panel-header"><h2>Reviewer completion</h2></div>
        <table>
          <thead><tr><th>Reviewer</th><th>Assigned</th><th>Completed</th><th>Pending</th></tr></thead>
          <tbody>{reviewers.map((row) => (
            <tr key={row.label}><td>{row.label}</td><td>{Number(row.assigned)}</td><td>{Number(row.completed)}</td><td>{Number(row.assigned - row.completed)}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
