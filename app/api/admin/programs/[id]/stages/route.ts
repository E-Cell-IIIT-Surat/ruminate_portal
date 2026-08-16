import { z } from "zod";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";

const schema = z.object({
  stages: z
    .array(z.object({ name: z.string().min(2).max(100), description: z.string().max(500).optional() }))
    .min(1)
    .max(20),
});
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requirePermission("program:update", id);
    const input = schema.parse(await request.json());
    const applications = await db.application.count({ where: { programId: id } });
    if (applications)
      return Response.json(
        {
          error:
            "Stages cannot be replaced after applications exist; add a future stage through a controlled migration.",
        },
        { status: 409 },
      );
    await db.$transaction(async (tx) => {
      await tx.programStage.deleteMany({ where: { programId: id } });
      for (const [index, stage] of input.stages.entries())
        await tx.programStage.create({
          data: {
            programId: id,
            ...stage,
            order: index + 1,
            isInitial: index === 0,
            isTerminal: index === input.stages.length - 1,
          },
        });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          programId: id,
          action: "stages.configure",
          entityType: "Program",
          entityId: id,
          metadata: { count: input.stages.length },
        },
      });
    });
    return Response.json({ ok: true });
  } catch (error) {
    return safeError(error);
  }
}
