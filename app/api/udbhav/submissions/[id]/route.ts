import { z } from "zod";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";
import { requireUdbhavAdmin, requireUdbhavViewer, statusMessage, udbhavStatuses } from "@/lib/udbhav";
import { queueAndDeliverEmail } from "@/lib/services/email";

const updateSchema = z.object({
  status: z.enum(udbhavStatuses),
  currentStage: z.string().trim().min(2).max(120).optional(),
  reason: z.string().trim().max(1000).optional().or(z.literal("")),
  secretMessage: z.string().trim().max(4000).optional().nullable(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireUdbhavViewer(id);
    const submission = await db.udbhavSubmission.findUnique({
      where: { id },
      include: {
        cycle: true,
        reviews: { include: { reviewer: { select: { name: true } } } },
        statusLog: { orderBy: { createdAt: "desc" }, include: { changedBy: { select: { name: true } } } },
      },
    });
    return Response.json({ submission });
  } catch (error) {
    return safeError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { current } = await requireUdbhavAdmin();
    const { id } = await params;
    const input = updateSchema.parse(await request.json());
    const existing = await db.udbhavSubmission.findUnique({
      where: { id },
      include: { leader: { select: { email: true, name: true } } },
    });
    if (!existing) return Response.json({ error: "Submission not found" }, { status: 404 });
    const message = statusMessage(input.status);
    const updated = await db.$transaction(async (tx) => {
      const saved = await tx.udbhavSubmission.update({
        where: { id },
        data: {
          status: input.status,
          currentStage: input.currentStage ?? existing.currentStage,
          secretMessage: input.secretMessage === undefined ? existing.secretMessage : input.secretMessage,
        },
      });
      await tx.udbhavStatusHistory.create({
        data: {
          submissionId: id,
          fromStatus: existing.status,
          toStatus: input.status,
          stage: input.currentStage ?? existing.currentStage,
          reason: input.reason || null,
          changedById: current.id,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: current.id,
          action: "udbhav.status.updated",
          entityType: "UdbhavSubmission",
          entityId: id,
          metadata: {
            fromStatus: existing.status,
            toStatus: input.status,
            stage: input.currentStage ?? existing.currentStage,
            reason: input.reason || null,
          },
        },
      });
      await tx.notification.create({
        data: {
          userId: existing.leaderId,
          type: "APPLICATION_STATUS",
          title: `UdbhAV update: ${input.status.replaceAll("_", " ")}`,
          body: input.secretMessage || message,
          href: `/udbhav/submissions/${id}`,
        },
      });
      return saved;
    });
    await queueAndDeliverEmail({
      recipientEmail: existing.leader.email,
      templateKey: `udbhav.status.${input.status.toLowerCase()}`,
      subject: `UdbhAV update: ${input.status.replaceAll("_", " ")}`,
      textBody: `${message}${input.secretMessage ? `\n\nPrivate note from the program team:\n${input.secretMessage}` : ""}`,
    });
    return Response.json({ submission: updated });
  } catch (error) {
    return safeError(error, { route: "/api/udbhav/submissions/[id]", method: "PATCH" });
  }
}
