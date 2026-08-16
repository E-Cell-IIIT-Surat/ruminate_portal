import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";

const profileInput = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().max(30).nullable().optional(),
  institution: z.string().max(180).nullable().optional(),
  degree: z.string().max(120).nullable().optional(),
  studyYear: z.string().max(60).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  studentId: z.string().max(80).nullable().optional(),
});

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const input = profileInput.parse(await request.json());
    const profile = await db.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id: user.id }, data: input });
      await tx.auditLog.create({
        data: { actorId: user.id, action: "profile.update", entityType: "User", entityId: user.id },
      });
      return updated;
    });
    return Response.json({ profile });
  } catch (error) {
    return safeError(error);
  }
}
