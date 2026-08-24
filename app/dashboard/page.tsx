import { auth } from "@/auth";
import { AuthGate } from "@/components/auth-gate";
import { PortalShell } from "@/components/portal-shell";
import { Badge, ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { hasDatabaseConfig } from "@/lib/env";
import { userAuthorization } from "@/lib/authz";
import { Bell, Blocks, ClipboardList, UsersRound } from "lucide-react";
import Link from "next/link";
import { participantVisibleStatus } from "@/lib/domain/status";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!hasDatabaseConfig())
    return (
      <AuthGate
        title="Portal setup required"
        body="Connect PostgreSQL and configure Google OAuth to activate secure participant access."
      />
    );
  const session = await auth();
  if (!session?.user) return <AuthGate />;
  const authorization = await userAuthorization(session.user.id);
  const canManage = authorization.isSuperAdmin || authorization.roles.has("PROGRAM_MANAGER");
  const canReview = authorization.roles.has("REVIEWER") || authorization.roles.has("FACULTY_REVIEWER");
  // Miniflare's local Worker TCP adapter can deadlock when several PrismaPg
  // connections are opened concurrently. Keep these reads sequential so the
  // dashboard remains reliable during local development and on edge runtimes.
  const applications = await db.application.findMany({
    where: { userId: session.user.id, archivedAt: null },
    select: {
      id: true,
      referenceId: true,
      status: true,
      submittedAt: true,
      program: { select: { name: true, resultsPublishedAt: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });
  const programs = await db.program.findMany({
    where: { visibility: "PUBLIC", archivedAt: null, status: { in: ["PUBLISHED", "REGISTRATION_OPEN"] } },
    select: { id: true, slug: true, name: true, registrationCloseAt: true },
    orderBy: { registrationCloseAt: "asc" },
    take: 4,
  });
  const notifications = await db.notification.findMany({
    where: { userId: session.user.id },
    select: { id: true, type: true, title: true, body: true, readAt: true, href: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const teams = await db.team.findMany({
    where: { leaderId: session.user.id },
    select: { id: true, name: true, program: { select: { name: true } }, _count: { select: { members: true } } },
    take: 4,
  });
  return (
    <PortalShell mode="participant" title="Participant portal" user={session.user}>
      <PageHeader
        eyebrow="Participant portal"
        title={`Welcome${session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}`}
        description="Everything important, in one place."
        action={
          <div className="hero-actions">
            <ButtonLink href="/programs">Explore programs</ButtonLink>
            {canManage && (
              <ButtonLink href="/admin" variant="secondary">
                Admin workspace
              </ButtonLink>
            )}
            {!canManage && canReview && (
              <ButtonLink href="/reviewer" variant="secondary">
                Reviewer workspace
              </ButtonLink>
            )}
          </div>
        }
      />
      <div className="dashboard-columns">
        <section>
          <div className="panel">
            <div className="panel-header">
              <h2>My applications</h2>
              <Link href="/applications">View all</Link>
            </div>
            {applications.length ? (
              <div className="item-list">
                {applications.map((item) => {
                  const visibleStatus = participantVisibleStatus(item.status, item.program.resultsPublishedAt);
                  return (
                    <a href={`/applications/${item.id}`} key={item.id}>
                      <span className="item-icon">
                        <ClipboardList />
                      </span>
                      <div>
                        <strong>{item.program.name}</strong>
                        <small>{item.referenceId}</small>
                      </div>
                      <Badge
                        tone={
                          visibleStatus === "SHORTLISTED" || visibleStatus === "SELECTED"
                            ? "green"
                            : visibleStatus === "REJECTED"
                              ? "red"
                              : "orange"
                        }
                      >
                        {visibleStatus.replaceAll("_", " ")}
                      </Badge>
                    </a>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={ClipboardList}
                title="No applications yet"
                body="When you start an application, it will stay here so you can save and return anytime."
                action={
                  <ButtonLink href="/programs" variant="secondary">
                    Explore programs
                  </ButtonLink>
                }
              />
            )}
          </div>
          <div className="panel">
            <div className="panel-header">
              <h2>Available programs</h2>
              <Link href="/programs">Browse all</Link>
            </div>
            {programs.length ? (
              <div className="item-list">
                {programs.map((item) => (
                  <a href={`/programs/${item.slug}`} key={item.id}>
                    <span className="item-icon">
                      <Blocks />
                    </span>
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        {item.registrationCloseAt
                          ? `Closes ${item.registrationCloseAt.toLocaleDateString("en-IN")}`
                          : "Dates to be announced"}
                      </small>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Blocks}
                title="No open registrations"
                body="New opportunities will appear here once published."
              />
            )}
          </div>
        </section>
        <aside>
          <div className="panel">
            <div className="panel-header">
              <h2>Notifications</h2>
            </div>
            {notifications.length ? (
              <div className="compact-list">
                {notifications.map((item) => (
                  <a href={item.href ?? "/notifications"} key={item.id} className={!item.readAt ? "unread" : ""}>
                    <strong>{item.title}</strong>
                    <small>{item.body}</small>
                  </a>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Bell}
                title="You're all caught up"
                body="Application and review updates will appear here."
              />
            )}
          </div>
          <div className="panel">
            <div className="panel-header">
              <h2>My teams</h2>
            </div>
            {teams.length ? (
              <div className="compact-list">
                {teams.map((team) => (
                  <div key={team.id}>
                    <strong>{team.name}</strong>
                    <small>
                      {team.program.name} · {team._count.members} members
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={UsersRound} title="No teams yet" body="Team registrations you lead will appear here." />
            )}
          </div>
          {notifications.some((item) => item.type === "ANNOUNCEMENT") && (
            <div className="panel">
              <div className="panel-header">
                <h2>Announcements</h2>
              </div>
              <div className="compact-list">
                {notifications
                  .filter((item) => item.type === "ANNOUNCEMENT")
                  .slice(0, 3)
                  .map((item) => (
                    <div key={item.id}>
                      <strong>{item.title}</strong>
                      <small>{item.body}</small>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </PortalShell>
  );
}
