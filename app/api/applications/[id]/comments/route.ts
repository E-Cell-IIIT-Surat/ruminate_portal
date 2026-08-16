import { z } from "zod";
import { requireApplicationAccess } from "@/lib/authz";
import { db } from "@/lib/db";
import { forbidden, safeError } from "@/lib/errors";

const schema = z.object({ body: z.string().min(2).max(10000), visibility: z.enum(["INTERNAL", "APPLICANT"]) });
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireApplicationAccess(id, "read");
    const input = schema.parse(await request.json());
    if (access.owns || (input.visibility === "APPLICANT" && !access.manages)) throw forbidden();
    const comment = await db.$transaction(async (tx) => {
      const created = await tx.applicationComment.create({
        data: { applicationId: id, authorId: access.current.id, body: input.body, visibility: input.visibility },
      });
      if (input.visibility === "APPLICANT")
        await tx.notification.create({
          data: {
            userId: access.application.userId,
            applicationId: id,
            type: "SYSTEM",
            title: "New application feedback",
            body: input.body.slice(0, 240),
            href: `/applications/${id}`,
          },
        });
      await tx.auditLog.create({
        data: {
          actorId: access.current.id,
          programId: access.application.programId,
          action: "application.comment.create",
          entityType: "ApplicationComment",
          entityId: created.id,
          metadata: { visibility: input.visibility },
        },
      });
      return created;
    });
    return Response.json({ comment }, { status: 201 });
  } catch (error) {
    return safeError(error);
  }
}
