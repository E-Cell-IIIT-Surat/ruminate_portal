import { PageHeader } from "@/components/ui";
import { RoleEditor } from "@/components/role-editor";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { AccountAccessControl } from "@/components/account-access-control";

export const dynamic = "force-dynamic";
export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requirePermission("user:manage");
  await requirePermission("role:manage");
  const { q = "", page: rawPage } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);
  const take = 50;
  const where = {
    ...(q.trim()
      ? {
          OR: [
            { name: { contains: q.trim(), mode: "insensitive" as const } },
            { email: { contains: q.trim(), mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [users, total] = await Promise.all([
    db.user.findMany({
      where: {
        ...where,
      },
      include: { roles: { include: { role: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    db.user.count({ where }),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Access control"
        title="Users and roles"
        description="Roles control portal-wide capabilities. Program Manager access is additionally scoped per program."
      />
      <form className="filter-bar">
        <input name="q" defaultValue={q} placeholder="Search name or email" aria-label="Search users" />
        <button className="button button-secondary">Search</button>
      </form>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Roles</th>
              <th>Status</th>
              <th>Access</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.name ?? "Unnamed user"}</strong>
                  <br />
                  <small>{user.email}</small>
                </td>
                <td>
                  <RoleEditor userId={user.id} initial={user.roles.map(({ role }) => role.name)} />
                </td>
                <td>{user.archivedAt ? "Disabled" : "Active"}</td>
                <td>
                  <AccountAccessControl userId={user.id} active={!user.archivedAt} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > take && (
        <nav className="pagination" aria-label="User pagination">
          <a aria-disabled={page === 1} href={`?page=${page - 1}&q=${encodeURIComponent(q)}`}>
            Previous
          </a>
          <span>
            Page {page} of {Math.ceil(total / take)}
          </span>
          <a aria-disabled={page * take >= total} href={`?page=${page + 1}&q=${encodeURIComponent(q)}`}>
            Next
          </a>
        </nav>
      )}
    </>
  );
}
