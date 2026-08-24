import { auth } from "@/auth";
import { EmptyState, PageHeader } from "@/components/ui";
import { userAuthorization } from "@/lib/authz";
import { db } from "@/lib/db";
import { ArrowRight, Megaphone } from "lucide-react";

export const dynamic = "force-dynamic";
export default async function AdminAnnouncementsPage() {
  const session = await auth();
  if (!session?.user) return null;
  const authorization = await userAuthorization(session.user.id);
  const scope = authorization.isSuperAdmin ? {} : { id: { in: [...authorization.managedProgramIds] } };
  const [announcements, programs] = await Promise.all([
    db.announcement.findMany({
      where: { program: scope },
      include: { program: { select: { id: true, name: true } }, createdBy: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.program.findMany({
      where: { ...scope, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Communication"
        title="Announcements"
        description="Publish targeted updates; participants receive an in-portal popup, notification, and queued email."
      />
      <div className="announcement-how panel">
        <div>
          <span className="eyebrow">How announcements work</span>
          <h2>One message, the right audience.</h2>
          <p>
            Choose a program, target all applicants or a specific status/stage, and publish. Email delivery is queued
            for the configured email worker.
          </p>
        </div>
        <div className="announcement-how-steps">
          <span>
            <b>01</b> Open a program
          </span>
          <span>
            <b>02</b> Choose an audience
          </span>
          <span>
            <b>03</b> Publish the update
          </span>
        </div>
      </div>
      <div className="panel announcement-programs">
        <div className="panel-header">
          <h2>Choose a program to publish</h2>
        </div>
        {programs.length ? (
          programs.map((program) => (
            <a href={`/admin/programs/${program.id}/announcements`} key={program.id}>
              <span>
                <strong>{program.name}</strong>
                <small>Program announcements</small>
              </span>
              <ArrowRight size={16} />
            </a>
          ))
        ) : (
          <EmptyState
            icon={Megaphone}
            title="No managed programs"
            body="Create or assign a program before publishing an announcement."
          />
        )}
      </div>
      <div className="panel">
        {announcements.length ? (
          <div className="compact-list">
            {announcements.map((item) => (
              <a
                href={item.programId ? `/admin/programs/${item.programId}/announcements` : "/admin/announcements"}
                key={item.id}
              >
                <strong>{item.title}</strong>
                <small>
                  {item.program?.name ?? "Portal-wide"} · {item.createdBy.name ?? item.createdBy.email} ·{" "}
                  {item.createdAt.toLocaleString("en-IN")}
                </small>
              </a>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Megaphone}
            title="No announcements"
            body="Published messages will appear here after you create them from a program workspace."
          />
        )}
      </div>
    </>
  );
}
