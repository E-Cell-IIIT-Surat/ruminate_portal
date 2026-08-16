import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";
import { programInput } from "@/lib/validation/program";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("program:create");
    const input = programInput.parse(await request.json());
    const program = await db.$transaction(async (tx) => {
      const created = await tx.program.create({ data: { ...input, createdById: actor.id } });
      await tx.programManager.create({ data: { programId: created.id, userId: actor.id } });
      await tx.form.create({ data: { programId: created.id, name: `${created.name} application` } });
      await tx.programStage.create({ data: { programId: created.id, name: "Application", order: 1, isInitial: true } });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          programId: created.id,
          action: "program.create",
          entityType: "Program",
          entityId: created.id,
        },
      });
      return created;
    });
    return Response.json({ program }, { status: 201 });
  } catch (error) {
    return safeError(error);
  }
}
