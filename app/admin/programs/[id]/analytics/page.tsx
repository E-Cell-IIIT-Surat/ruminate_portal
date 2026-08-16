import { Metric, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const program = await db.program.findUnique({ where: { id }, select: { name: true } });
  const grouped = await db.application.groupBy({ by: ["status"], where: { programId: id }, _count: { _all: true } });
  const total = grouped.reduce((sum, item) => sum + item._count._all, 0);
  const value = (status: string) => grouped.find((item) => item.status === status)?._count._all ?? 0;
  return (
    <>
      <PageHeader
        eyebrow={program?.name}
        title="Program analytics"
        description="Aggregated operational data only."
        action={
          <a className="button button-secondary" href={`/api/admin/programs/${id}/export`}>
            Export CSV
          </a>
        }
      />
      <div className="metric-grid">
        <Metric label="Applications" value={total} />
        <Metric label="Submitted" value={value("SUBMITTED")} />
        <Metric label="Draft" value={value("DRAFT")} />
        <Metric label="Shortlisted" value={value("SHORTLISTED")} />
      </div>
      <div className="panel status-bars">
        {grouped.map((item) => (
          <div key={item.status}>
            <span>{item.status.replaceAll("_", " ")}</span>
            <i>
              <b style={{ width: `${total ? (item._count._all / total) * 100 : 0}%` }} />
            </i>
            <strong>{item._count._all}</strong>
          </div>
        ))}
      </div>
    </>
  );
}
