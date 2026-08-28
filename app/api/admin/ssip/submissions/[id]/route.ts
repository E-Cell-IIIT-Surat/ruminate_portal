import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/authz";
import { safeError, notFound } from "@/lib/errors";
import { queueAndDeliverEmail } from "@/lib/services/email";

const statusSchema = z.object({
  status: z.enum(["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "SHORTLISTED", "ON_HOLD", "ACCEPTED", "REJECTED"]),
  note: z.string().trim().max(2000).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("application:update-status");
    const { id } = await params;
    const input = statusSchema.parse(await request.json());
    const existing = await db.sSIPSubmission.findUnique({ where: { id } });
    if (!existing) throw notFound("SSIP submission");
    const submission = await db.sSIPSubmission.update({ where: { id }, data: { status: input.status } });
    await db.auditLog.create({
      data: {
        actorId: actor.id,
        action: "SSIP_STATUS_UPDATED",
        entityType: "SSIP_SUBMISSION",
        entityId: id,
        metadata: { from: existing.status, to: input.status, note: input.note ?? null },
      },
    });
    await Promise.allSettled([
      db.notification.create({
        data: {
          userId: existing.userId,
          type: "APPLICATION",
          title: `SSIP idea ${input.status.toLowerCase().replaceAll("_", " ")}`,
          body: input.note || `Your SSIP idea status is now ${input.status.toLowerCase().replaceAll("_", " ")}.`,
          href: "/ssip",
        },
      }),
      queueAndDeliverEmail({
        recipientEmail: existing.email,
        templateKey: `ssip-status-${input.status.toLowerCase()}`,
        subject: `SSIP update · ${input.status.replaceAll("_", " ")}`,
        textBody: `Hi ${existing.name},\n\nYour SSIP idea “${existing.title}” (${existing.referenceId}) is now ${input.status.toLowerCase().replaceAll("_", " ")}.${input.note ? `\n\nMessage from the review team:\n${input.note}` : ""}\n\nSign in to Ruminate to view the latest update.\n\nRuminate · E-Cell IIIT Surat`,
      }),
    ]);
    return Response.json({ submission });
  } catch (error) {
    return safeError(error, { route: "/api/admin/ssip/submissions/[id]", method: "PATCH" });
  }
}
