import { auth } from "@/auth";
import { AuthGate } from "@/components/auth-gate";
import { PortalShell } from "@/components/portal-shell";
import { TeamDirectory } from "@/components/team-directory";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { hasDatabaseConfig } from "@/lib/env";
import type { Session } from "next-auth";

export const dynamic = "force-dynamic";

function teamPayload(team: {
  id: string;
  name: string;
  motto: string | null;
  projectSummary: string | null;
  lookingFor: string | null;
  requiredMembers: number;
  status?: string;
  leader: { name: string | null; email: string };
  leaderId: string;
  members: Array<{ userId: string | null; email: string }>;
  joinRequests?: Array<{ status: string }>;
}, userId: string) {
  return {
    id: team.id,
    name: team.name,
    motto: team.motto,
    projectSummary: team.projectSummary,
    lookingFor: team.lookingFor,
    requiredMembers: team.requiredMembers,
    status: team.status ?? "PUBLIC",
    memberCount: team.members.length,
    leaderName: team.leader.name ?? team.leader.email.split("@")[0],
    leaderEmail: team.leader.email,
    isLeader: team.leaderId === userId,
    isMember: team.members.some((member) => member.userId === userId),
    requestStatus: team.joinRequests?.[0]?.status ?? null,
  };
}

async function teamsData(userId: string) {
  const [publicTeams, myTeams, incomingRequests, myRequests] = await Promise.all([
    db.team.findMany({
      where: { status: "PUBLIC", isPublic: true },
      include: {
        leader: { select: { name: true, email: true } },
        members: { select: { userId: true, email: true } },
        joinRequests: { where: { requesterId: userId }, select: { status: true }, take: 1 },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 60,
    }),
    db.team.findMany({
      where: { OR: [{ leaderId: userId }, { members: { some: { userId } } }] },
      include: {
        leader: { select: { name: true, email: true } },
        members: { select: { userId: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    db.teamJoinRequest.findMany({
      where: { status: "PENDING", team: { leaderId: userId } },
      include: {
        requester: { select: { name: true, email: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    db.teamJoinRequest.findMany({
      where: { requesterId: userId },
      include: { team: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  return {
    publicTeams: publicTeams.map((team) => teamPayload(team, userId)),
    myTeams: myTeams.map((team) => teamPayload(team, userId)),
    incomingRequests: incomingRequests.map((request) => ({
      id: request.id,
      teamId: request.team.id,
      teamName: request.team.name,
      message: request.message,
      requesterName: request.requester.name ?? request.requester.email.split("@")[0],
      requesterEmail: request.requester.email,
      createdAt: request.createdAt.toISOString(),
    })),
    myRequests: myRequests.map((request) => ({
      id: request.id,
      status: request.status,
      message: request.message,
      teamName: request.team.name,
      createdAt: request.createdAt.toISOString(),
    })),
  };
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
  if (!session?.user?.id) return <AuthGate />;
  let data: Awaited<ReturnType<typeof teamsData>>;
  try {
    data = await teamsData(session.user.id);
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
        title="Team directory"
        description="Create a team, discover public teams, request to join, and manage join requests as a leader."
      />
      <TeamDirectory {...data} />
    </PortalShell>
  );
}
