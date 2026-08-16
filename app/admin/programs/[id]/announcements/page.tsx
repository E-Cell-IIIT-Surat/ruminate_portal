import { AnnouncementEditor } from "@/components/program-config-editors";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/authz";
export const dynamic = "force-dynamic";
export default async function AnnouncementsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("announcement:create", id);
  const program = await db.program.findUnique({
    where: { id },
    include: { announcements: { orderBy: { createdAt: "desc" } }, stages: { orderBy: { order: "asc" } } },
  });
  return (
    <>
      <PageHeader
        eyebrow={program?.name}
        title="Announcements"
        description="Publish program-scoped updates to submitted applicants."
      />
      <AnnouncementEditor programId={id} stages={program?.stages ?? []} />
      {program?.announcements.map((item) => (
        <div className="panel announcement-card" key={item.id}>
          <BadgeLine date={item.publishedAt} />
          <h2>{item.title}</h2>
          <p>{item.body}</p>
          <small>Audience: {item.targetType.replaceAll("_", " ").toLowerCase()}</small>
        </div>
      ))}
    </>
  );
}
function BadgeLine({ date }: { date: Date | null }) {
  return <small>{date ? date.toLocaleString("en-IN") : "Draft"}</small>;
}
