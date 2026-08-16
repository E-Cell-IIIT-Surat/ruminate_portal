import { z } from "zod";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";

const schema = z.object({
  name: z.string().min(2).max(120),
  stageId: z.string().cuid().nullable().optional(),
  criteria: z
    .array(
      z.object({
        name: z.string().min(2).max(120),
        description: z.string().max(500).optional(),
        maxScore: z.number().positive().max(1000),
        weight: z.number().positive().max(100),
      }),
    )
    .min(1)
    .max(30),
});
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requirePermission("program:update", id);
    const input = schema.parse(await request.json());
    if (input.stageId && !(await db.programStage.findFirst({ where: { id: input.stageId, programId: id } })))
      return Response.json({ error: "Stage not found" }, { status: 404 });
    const rubric = await db.rubric.create({
      data: {
        programId: id,
        name: input.name,
        stageId: input.stageId,
        criteria: { create: input.criteria.map((criterion, index) => ({ ...criterion, order: index + 1 })) },
      },
    });
    await db.auditLog.create({
      data: { actorId: actor.id, programId: id, action: "rubric.create", entityType: "Rubric", entityId: rubric.id },
    });
    return Response.json({ rubric }, { status: 201 });
  } catch (error) {
    return safeError(error);
  }
}
