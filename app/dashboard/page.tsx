import { auth } from "@/auth";
import { AuthGate } from "@/components/auth-gate";
import { PortalShell } from "@/components/portal-shell";
import { Badge, ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { hasDatabaseConfig } from "@/lib/env";
import { Bell, Blocks, ClipboardList, UsersRound } from "lucide-react";
import Link from "next/link";

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
  const [applications, programs, announcements, notifications, teams] = await Promise.all([
    db.application.findMany({
      where: { userId: session.user.id, archivedAt: null },
      select: { id: true, referenceId: true, status: true, submittedAt: true, program: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    db.program.findMany({
      where: { visibility: "PUBLIC", archivedAt: null, status: { in: ["PUBLISHED", "REGISTRATION_OPEN"] } },
      select: { id: true, slug: true, name: true, registrationCloseAt: true },
      orderBy: { registrationCloseAt: "asc" },
      take: 4,
    }),
    db.announcement.findMany({
      where: { publishedAt: { lte: new Date() }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      select: { id: true, title: true, body: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),
    db.notification.findMany({
      where: { userId: session.user.id },
      select: { id: true, title: true, body: true, readAt: true, href: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.team.findMany({
      where: { leaderId: session.user.id },
      select: { id: true, name: true, program: { select: { name: true } }, _count: { select: { members: true } } },
      take: 4,
    }),
  ]);
  return (
    <PortalShell mode="participant" title="Participant portal" user={session.user}>
      <PageHeader
        eyebrow="Participant portal"
        title={`Welcome${session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}`}
        description="Everything important, in one place."
        action={<ButtonLink href="/programs">Explore programs</ButtonLink>}
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
                {applications.map((item) => (
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
                        item.status === "SHORTLISTED" || item.status === "SELECTED"
                          ? "green"
                          : item.status === "REJECTED"
                            ? "red"
                            : "orange"
                      }
                    >
                      {item.status.replaceAll("_", " ")}
                    </Badge>
                  </a>
                ))}
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
                  <a href={item.href ?? "#"} key={item.id} className={!item.readAt ? "unread" : ""}>
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
          {announcements.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <h2>Announcements</h2>
              </div>
              <div className="compact-list">
                {announcements.map((item) => (
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
