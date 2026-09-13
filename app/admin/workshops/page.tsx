import { AdminWorkshopForm } from "@/components/admin-workshop-form";
import { Badge, ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { BookOpenCheck } from "lucide-react";
import { DeleteEventButton } from "@/components/delete-event-button";
import { WorkshopLaunch } from "@/components/workshop-launch";

export const dynamic = "force-dynamic";

export default async function AdminWorkshopsPage() {
  const actor = await requirePermission("program:update");
  const customWorkshops = await db.program.findMany({
    where: {
      type: "WORKSHOP",
      archivedAt: null,
      ...(actor.isSuperAdmin ? {} : { id: { in: [...actor.managedProgramIds] } }),
    },
    select: { id: true, name: true, status: true, _count: { select: { applications: true } } },
    orderBy: { updatedAt: "desc" },
  });
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
      <section className="panel form-panel">
        <h2>
          Workshops with custom forms <AdminHelp title="Workshops with custom forms" />
        </h2>
        <p>Use these for workshops that need extra questions, team details, or document uploads.</p>
        <ButtonLink href="/admin/programs/new?type=WORKSHOP" variant="secondary">
          Create workshop with a custom form
        </ButtonLink>
        <div className="program-grid">
          {customWorkshops.map((workshop) => (
            <div className="program-card" key={workshop.id}>
              <h3>{workshop.name}</h3>
              <Badge>{workshop.status.replaceAll("_", " ")}</Badge>
              <p>{workshop._count.applications} applications</p>
              <ButtonLink href={`/admin/programs/${workshop.id}`} variant="secondary">
                Manage workshop
              </ButtonLink>
            </div>
          ))}
        </div>
      </section>
      <div className="panel">
        <div className="panel-header">
          <h2>
            Workshop history <AdminHelp title="Workshop history" />
          </h2>
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
                  <th>Actions</th>
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
                    <td>
                      <WorkshopLaunch id={workshop.id} closesAt={workshop.registrationCloseAt?.toISOString() ?? null} />
                      <DeleteEventButton endpoint={`/api/workshops/${workshop.id}`} name={workshop.name} />
                    </td>
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
import { AdminHelp } from "@/components/admin-help";
