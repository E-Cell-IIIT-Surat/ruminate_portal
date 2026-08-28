import { z } from "zod";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { notFound, safeError } from "@/lib/errors";
import { queueAndDeliverEmail } from "@/lib/services/email";

const statusSchema = z.object({ status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("application:update-status");
    const { id } = await params;
    const { status } = statusSchema.parse(await request.json());
    const existing = await db.workshopBooking.findFirst({
      where: { id, workshop: "financial-literacy" },
      select: { id: true, email: true, name: true, workshop: true },
    });
    if (!existing) throw notFound("Workshop booking");
    const booking = await db.workshopBooking.update({ where: { id }, data: { status } });
    await db.auditLog.create({
      data: {
        actorId: actor.id,
        action: "workshop.booking.status",
        entityType: "WorkshopBooking",
        entityId: id,
        metadata: { workshop: "financial-literacy", status },
      },
    });
    await queueAndDeliverEmail({
      recipientEmail: existing.email,
      templateKey: `workshop.booking.${status.toLowerCase()}`,
      subject: `Workshop booking ${status.toLowerCase()}`,
      textBody: `Hello ${existing.name}, your booking for ${existing.workshop} is now ${status.toLowerCase()}.`,
    });
    return Response.json({ booking: { id: booking.id, status: booking.status } });
  } catch (error) {
    return safeError(error);
  }
}
