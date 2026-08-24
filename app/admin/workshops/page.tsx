import { AdminWorkshopForm } from "@/components/admin-workshop-form";
import { Badge, ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { BookOpenCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminWorkshopsPage() {
  await requirePermission("program:update");
  const workshops = await db.workshop.findMany({
    where: { archivedAt: null },
    include: { _count: { select: { bookings: true } } },
    orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
  });
  return (
    <>
      <PageHeader
        eyebrow="Learning catalogue"
        title="Workshops"
        description="Create workshops, publish registration windows, and review every booking."
        action={
          <ButtonLink href="/admin/workshops/bookings" variant="secondary">
            View all bookings
          </ButtonLink>
        }
      />
      <AdminWorkshopForm />
      <div className="panel">
        <div className="panel-header">
          <h2>Workshop history</h2>
          <span>{workshops.length} total</span>
        </div>
        {workshops.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Workshop</th>
                  <th>Banner</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th>Bookings</th>
                </tr>
              </thead>
              <tbody>
                {workshops.map((workshop) => (
                  <tr key={workshop.id}>
                    <td>
                      <strong>{workshop.name}</strong>
                      <br />
                      <small>
                        {workshop.batch ?? "All batches"} · {workshop.year ?? "—"}
                      </small>
                    </td>
                    <td>{workshop.bannerUrl ? "Configured" : "—"}</td>
                    <td>
                      {workshop.startsAt?.toLocaleString("en-IN") ?? "Date to be announced"}
                      <br />
                      <small>{workshop.venue ?? "Venue to be announced"}</small>
                    </td>
                    <td>
                      <Badge
                        tone={
                          workshop.status === "PUBLISHED"
                            ? "green"
                            : workshop.status === "COMPLETED"
                              ? "blue"
                              : "neutral"
                        }
                      >
                        {workshop.status}
                      </Badge>
                    </td>
                    <td>{workshop._count.bookings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={BookOpenCheck}
            title="No workshops yet"
            body="Use the form above to add the first workshop."
          />
        )}
      </div>
    </>
  );
}
