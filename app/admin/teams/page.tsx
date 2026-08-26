import { AdminTeamConsole } from "@/components/admin-team-console";
import { EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { UsersRound } from "lucide-react";

export const dynamic = "force-dynamic";

async function getTeams() {
  return db.team.findMany({
    include: {
      leader: { select: { name: true, email: true } },
      _count: { select: { members: true, joinRequests: { where: { status: "PENDING" } } } },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 100,
  });
}

export default async function AdminTeamsPage() {
  const teams = await getTeams();
  return (
    <>
      <PageHeader
        eyebrow="Teams"
        title="Team directory control"
        description="Approve new public team requests, monitor members, and close listings when teams are full."
      />
      {teams.length ? (
        <AdminTeamConsole
          teams={teams.map((team) => ({
            id: team.id,
            name: team.name,
            motto: team.motto,
            projectSummary: team.projectSummary,
            lookingFor: team.lookingFor,
            requiredMembers: team.requiredMembers,
            memberCount: team._count.members,
            pendingRequests: team._count.joinRequests,
            status: team.status,
            isPublic: team.isPublic,
            leaderName: team.leader.name ?? team.leader.email.split("@")[0],
            leaderEmail: team.leader.email,
            createdAt: team.createdAt.toISOString(),
          }))}
        />
      ) : (
        <div className="panel">
          <EmptyState
            icon={UsersRound}
            title="No teams yet"
            body="Participant team creation requests will appear here for approval."
          />
        </div>
      )}
    </>
  );
}
