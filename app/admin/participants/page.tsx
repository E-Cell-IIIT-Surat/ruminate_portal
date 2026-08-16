import { auth } from "@/auth";
import { EmptyState, PageHeader } from "@/components/ui";
import { userAuthorization } from "@/lib/authz";
import { db } from "@/lib/db";
import { UsersRound } from "lucide-react";

export const dynamic = "force-dynamic";
export default async function ParticipantsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await auth();
  if (!session?.user) return null;
  const authorization = await userAuthorization(session.user.id);
  const { q = "" } = await searchParams;
  const programScope = authorization.isSuperAdmin ? {} : { programId: { in: [...authorization.managedProgramIds] } };
  const users = await db.user.findMany({
    where: {
      applications: { some: programScope },
      ...(q.trim()
        ? {
            OR: [
              { name: { contains: q.trim(), mode: "insensitive" } },
              { email: { contains: q.trim(), mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      institution: true,
      applications: { where: programScope, select: { id: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <>
      <PageHeader
        eyebrow="Participants"
        title="Participant directory"
        description="Only people connected to programs you are authorized to manage."
      />
      <form className="filter-bar">
        <input name="q" defaultValue={q} placeholder="Search name or email" />
        <button className="button button-secondary">Search</button>
      </form>
      <div className="panel">
        {users.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Institution</th>
                  <th>Applications</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name ?? "Unnamed"}</strong>
                      <br />
                      <small>{user.email}</small>
                    </td>
                    <td>{user.institution ?? "—"}</td>
                    <td>{user.applications.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={UsersRound}
            title="No participants"
            body="Submitted program applications will populate this directory."
          />
        )}
      </div>
    </>
  );
}
