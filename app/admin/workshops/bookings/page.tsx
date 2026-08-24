import { BookOpenCheck } from "lucide-react";
import { WorkshopBookingStatusControl } from "@/components/workshop-booking-status";
import { EmptyState, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function WorkshopBookingsPage() {
  await requirePermission("application:view");
  const bookings = await db.workshopBooking.findMany({
    include: { workshopRecord: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
  return (
    <>
      <PageHeader
        eyebrow="Learning catalogue"
        title="Workshop bookings"
        description="Review every seat request and send confirmation updates."
      />
      <div className="panel">
        {bookings.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Workshop</th>
                  <th>Student</th>
                  <th>Academic details</th>
                  <th>Contact</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <strong>{booking.workshopRecord?.name ?? booking.workshop}</strong>
                      <br />
                      <small>{booking.createdAt.toLocaleString("en-IN")}</small>
                    </td>
                    <td>
                      <strong>{booking.name}</strong>
                      <br />
                      <small>{booking.studentId ?? "No student ID"}</small>
                    </td>
                    <td>
                      {booking.batch} · {booking.year}
                      <br />
                      <small>{booking.department ?? "—"}</small>
                    </td>
                    <td>
                      {booking.email}
                      <br />
                      <small>{booking.phone}</small>
                    </td>
                    <td>
                      <small>{booking.reason ?? "—"}</small>
                    </td>
                    <td>
                      <WorkshopBookingStatusControl
                        id={booking.id}
                        initial={booking.status}
                        endpoint={`/api/admin/workshops/bookings/${booking.id}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={BookOpenCheck} title="No bookings yet" body="Student seat requests will appear here." />
        )}
      </div>
    </>
  );
}
