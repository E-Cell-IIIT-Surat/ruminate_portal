import { auth } from "@/auth";
import { Metric, PageHeader } from "@/components/ui";
import { userAuthorization } from "@/lib/authz";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export default async function AdminAnalyticsPage() {
  const session = await auth();
  if (!session?.user) return null;
  const authorization = await userAuthorization(session.user.id);
  const scope = authorization.isSuperAdmin ? {} : { programId: { in: [...authorization.managedProgramIds] } };
  const grouped = await db.application.groupBy({ by: ["status"], where: scope, _count: { _all: true } });
  const total = grouped.reduce((sum, row) => sum + row._count._all, 0);
  const count = (status: string) => grouped.find((row) => row.status === status)?._count._all ?? 0;
  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title="Portfolio analytics"
        description="Aggregated application outcomes across your authorized programs."
      />
      <div className="metric-grid">
        <Metric label="Applications" value={total} />
        <Metric label="Submitted" value={count("SUBMITTED")} />
        <Metric label="Under review" value={count("UNDER_REVIEW")} />
        <Metric label="Selected / approved" value={count("SELECTED") + count("APPROVED")} />
      </div>
      <div className="panel">
        <div className="panel-header">
          <h2>Status distribution</h2>
        </div>
        <div className="compact-list">
          {grouped.map((row) => (
            <div key={row.status}>
              <strong>{row.status.replaceAll("_", " ")}</strong>
              <small>{row._count._all} applications</small>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
