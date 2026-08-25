import { auth } from "@/auth";
import { AuthGate } from "@/components/auth-gate";
import { PortalShell } from "@/components/portal-shell";
import { EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { hasDatabaseConfig } from "@/lib/env";
import { UsersRound } from "lucide-react";
import type { Session } from "next-auth";

export const dynamic = "force-dynamic";

function teamsQuery(userId: string) {
  return db.team.findMany({
    where: { OR: [{ leaderId: userId }, { members: { some: { userId } } }] },
    include: {
      program: { select: { name: true } },
      application: { select: { id: true, status: true } },
      members: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export default async function TeamsPage() {
  if (!hasDatabaseConfig()) return <AuthGate title="Portal setup required" />;
  let session: Session | null;
  try {
    session = await auth();
  } catch (error) {
    console.error("[teams] authentication check failed", error);
    return <AuthGate title="Teams temporarily unavailable" body="The live auth service could not be reached." />;
  }
  if (!session?.user) return <AuthGate />;
  let teams: Awaited<ReturnType<typeof teamsQuery>> = [];
  try {
    teams = await teamsQuery(session.user.id);
  } catch (error) {
    console.error("[teams] database read failed", error);
    return (
      <AuthGate
        title="Teams temporarily unavailable"
        body="The portal could not read teams from the production database."
      />
    );
  }
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
