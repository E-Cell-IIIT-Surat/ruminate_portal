import { auth } from "@/auth";
import { PageHeader } from "@/components/ui";
import { userAuthorization } from "@/lib/authz";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export default async function AuditLogsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await auth();
  if (!session?.user) return null;
  const authorization = await userAuthorization(session.user.id);
  if (!authorization.grants.has("audit:view") && !authorization.roles.has("PROGRAM_MANAGER"))
    return <PageHeader title="Audit access unavailable" />;
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);
  const take = 50;
  const where = authorization.isSuperAdmin ? {} : { programId: { in: [...authorization.managedProgramIds] } };
  const [events, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { actor: { select: { name: true, email: true } }, program: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    db.auditLog.count({ where }),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Security"
        title="Audit log"
        description={`${total} immutable operational events in your authorized scope.`}
      />
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Program / entity</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{event.createdAt.toLocaleString("en-IN")}</td>
                <td>{event.action}</td>
                <td>{event.actor?.name ?? event.actor?.email ?? "System"}</td>
                <td>{event.program?.name ?? event.entityType}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > take && (
        <nav className="pagination">
          <a aria-disabled={page === 1} href={`?page=${page - 1}`}>
            Previous
          </a>
          <span>
            Page {page} of {Math.ceil(total / take)}
          </span>
          <a aria-disabled={page * take >= total} href={`?page=${page + 1}`}>
            Next
          </a>
        </nav>
      )}
    </>
  );
}
