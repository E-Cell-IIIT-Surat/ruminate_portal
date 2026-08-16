import { auth } from "@/auth";
import { userAuthorization } from "@/lib/authz";
import { db } from "@/lib/db";
import { Metric, PageHeader, EmptyState } from "@/components/ui";
import { Activity } from "lucide-react";

export const dynamic = "force-dynamic";
export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user) return null;
  const authorization = await userAuthorization(session.user.id);
  const scope = authorization.isSuperAdmin ? {} : { id: { in: [...authorization.managedProgramIds] } };
  const [activePrograms, openRegistrations, applications, pendingReviews, recent] = await Promise.all([
    db.program.count({
      where: { ...scope, archivedAt: null, status: { in: ["PUBLISHED", "REGISTRATION_OPEN", "IN_PROGRESS"] } },
    }),
    db.program.count({ where: { ...scope, archivedAt: null, status: "REGISTRATION_OPEN" } }),
    db.application.count({ where: { program: scope, status: { not: "DRAFT" } } }),
    db.reviewerAssignment.count({
      where: { application: { program: scope }, status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
    }),
    db.auditLog.findMany({
      where: { program: scope },
      select: {
        id: true,
        action: true,
        entityType: true,
        createdAt: true,
        actor: { select: { name: true, email: true } },
        program: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Admin dashboard"
        description="Live activity across the programs you manage."
      />
      <div className="metric-grid">
        <Metric label="Active programs" value={activePrograms} />
        <Metric label="Open registrations" value={openRegistrations} />
        <Metric label="Applications received" value={applications} />
        <Metric label="Pending reviews" value={pendingReviews} />
      </div>
      <section className="panel">
        <div className="panel-header">
          <h2>Recent activity</h2>
          <a href="/admin/audit-logs">View audit log</a>
        </div>
        {recent.length ? (
          <div className="compact-list">
            {recent.map((event) => (
              <div key={event.id}>
                <strong>{event.action.replaceAll(".", " ")}</strong>
                <small>
                  {event.actor?.name ?? event.actor?.email ?? "System"} · {event.program?.name ?? event.entityType} ·{" "}
                  {event.createdAt.toLocaleString("en-IN")}
                </small>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Activity}
            title="No activity yet"
            body="Program, application, and review actions will be recorded here."
          />
        )}
      </section>
    </>
  );
}
