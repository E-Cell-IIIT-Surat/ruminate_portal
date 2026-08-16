import { ManagerAssignment } from "@/components/manager-assignment";
import { Metric, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export default async function ProgramReviewersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePermission("reviewer:assign", id);
  const [program, assignments, users] = await Promise.all([
    db.program.findUniqueOrThrow({
      where: { id },
      include: { managers: { include: { user: { select: { id: true, name: true, email: true } } } } },
    }),
    db.reviewerAssignment.findMany({
      where: { application: { programId: id } },
      include: { reviewer: { select: { name: true, email: true } } },
    }),
    actor.isSuperAdmin
      ? db.user.findMany({
          where: { archivedAt: null },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
          take: 200,
        })
      : Promise.resolve([]),
  ]);
  const completed = assignments.filter((item) => item.status === "COMPLETED").length;
  const grouped = new Map<string, { name: string; assigned: number; completed: number }>();
  assignments.forEach((item) => {
    const key = item.reviewerId;
    const row = grouped.get(key) ?? { name: item.reviewer.name ?? item.reviewer.email, assigned: 0, completed: 0 };
    row.assigned += 1;
    if (item.status === "COMPLETED") row.completed += 1;
    grouped.set(key, row);
  });
  return (
    <>
      <PageHeader
        eyebrow={program.name}
        title="Reviewers and managers"
        description="Reviewer workload and program-scoped management access."
      />
      <div className="metric-grid">
        <Metric label="Assignments" value={assignments.length} />
        <Metric label="Completed" value={completed} />
        <Metric label="Managers" value={program.managers.length} />
        <Metric label="Reviewers" value={grouped.size} />
      </div>
      <div className="panel">
        <div className="panel-header">
          <h2>Reviewer workload</h2>
        </div>
        <div className="compact-list">
          {[...grouped.values()].map((row) => (
            <div key={row.name}>
              <strong>{row.name}</strong>
              <small>
                {row.completed} of {row.assigned} completed
              </small>
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <div className="panel-header">
          <h2>Program managers</h2>
        </div>
        <div className="compact-list">
          {program.managers.map(({ user }) => (
            <div key={user.id}>
              <strong>{user.name ?? user.email}</strong>
              <small>{user.email}</small>
            </div>
          ))}
        </div>
        {actor.isSuperAdmin && <ManagerAssignment programId={id} users={users} />}
      </div>
    </>
  );
}
