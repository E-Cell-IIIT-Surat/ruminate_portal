import { auth } from "@/auth";
import { AuthGate } from "@/components/auth-gate";
import { PortalShell } from "@/components/portal-shell";
import { EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { UsersRound } from "lucide-react";

export const dynamic = "force-dynamic";
export default async function TeamsPage() {
  const session = await auth();
  if (!session?.user) return <AuthGate />;
  const teams = await db.team.findMany({
    where: { OR: [{ leaderId: session.user.id }, { members: { some: { userId: session.user.id } } }] },
    include: {
      program: { select: { name: true } },
      application: { select: { id: true, status: true } },
      members: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <PortalShell mode="participant" title="Participant portal" user={session.user}>
      <PageHeader
        eyebrow="Collaboration"
        title="My teams"
        description="Teams connected to your program applications."
      />
      <div className="panel">
        {teams.length ? (
          <div className="compact-list">
            {teams.map((team) => (
              <a href={`/applications/${team.application.id}`} key={team.id}>
                <strong>{team.name}</strong>
                <small>
                  {team.program.name} · {team.members.length} members · {team.application.status.replaceAll("_", " ")}
                </small>
              </a>
            ))}
          </div>
        ) : (
          <EmptyState icon={UsersRound} title="No teams yet" body="Team-based applications will appear here." />
        )}
      </div>
    </PortalShell>
  );
}
