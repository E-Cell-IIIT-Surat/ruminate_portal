import { auth } from "@/auth";
import { EmptyState, PageHeader } from "@/components/ui";
import { userAuthorization } from "@/lib/authz";
import { db } from "@/lib/db";
import { Megaphone } from "lucide-react";

export const dynamic = "force-dynamic";
export default async function AdminAnnouncementsPage() {
  const session = await auth();
  if (!session?.user) return null;
  const authorization = await userAuthorization(session.user.id);
  const scope = authorization.isSuperAdmin ? {} : { id: { in: [...authorization.managedProgramIds] } };
  const announcements = await db.announcement.findMany({
    where: { program: scope },
    include: { program: { select: { id: true, name: true } }, createdBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <>
      <PageHeader
        eyebrow="Communication"
        title="Announcements"
        description="Messages published across the programs you manage."
      />
      <div className="panel">
        {announcements.length ? (
          <div className="compact-list">
            {announcements.map((item) => (
              <a href={item.programId ? `/admin/programs/${item.programId}/announcements` : "#"} key={item.id}>
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
            body="Publish announcements from an individual program."
          />
        )}
      </div>
    </>
  );
}
