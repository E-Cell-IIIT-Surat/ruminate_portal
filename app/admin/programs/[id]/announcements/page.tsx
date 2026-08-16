import { AnnouncementEditor } from "@/components/program-config-editors";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function AnnouncementsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const program = await db.program.findUnique({
    where: { id },
    include: { announcements: { orderBy: { createdAt: "desc" } } },
  });
  return (
    <>
      <PageHeader
        eyebrow={program?.name}
        title="Announcements"
        description="Publish program-scoped updates to submitted applicants."
      />
      <AnnouncementEditor programId={id} />
      {program?.announcements.map((item) => (
        <div className="panel announcement-card" key={item.id}>
          <BadgeLine date={item.publishedAt} />
          <h2>{item.title}</h2>
          <p>{item.body}</p>
        </div>
      ))}
    </>
  );
}
function BadgeLine({ date }: { date: Date | null }) {
  return <small>{date ? date.toLocaleString("en-IN") : "Draft"}</small>;
}
