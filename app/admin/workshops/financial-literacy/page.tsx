import { BookOpenCheck } from "lucide-react";
import { WorkshopBookingStatus } from "@prisma/client";
import { WorkshopBookingStatusControl } from "@/components/workshop-booking-status";
import { PageHeader, EmptyState } from "@/components/ui";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function FinancialLiteracyBookingsPage() {
  await requirePermission("application:view");
  const bookings = await db.workshopBooking.findMany({
    where: { workshop: "financial-literacy" },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return (
    <>
      <PageHeader
        eyebrow="Financial literacy workshop"
        title="Seat bookings"
        description={`${bookings.length} booking request${bookings.length === 1 ? "" : "s"} · review and confirm attendance.`}
      />
      <div className="panel">
        {bookings.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Academic details</th>
                  <th>Contact</th>
                  <th>Submitted</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
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
                    <td>{booking.createdAt.toLocaleString("en-IN")}</td>
                    <td>
                      <WorkshopBookingStatusControl id={booking.id} initial={booking.status as WorkshopBookingStatus} />
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
