import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/authz";
import { safeError } from "@/lib/errors";

const settingsSchema = z
  .object({
    isOpen: z.boolean(),
    opensAt: z.coerce.date().nullable().optional(),
    closesAt: z.coerce.date().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.opensAt && value.closesAt && value.opensAt >= value.closesAt)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["closesAt"], message: "Close time must be after open time" });
  });

export async function GET() {
  try {
    await requirePermission("program:update");
    const settings = await db.sSIPSettings.findUnique({ where: { id: "default" } });
    return Response.json({ settings });
  } catch (error) {
    return safeError(error, { route: "/api/admin/ssip/settings", method: "GET" });
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requirePermission("program:update");
    const input = settingsSchema.parse(await request.json());
    const settings = await db.sSIPSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        isOpen: input.isOpen,
        opensAt: input.opensAt ?? null,
        closesAt: input.closesAt ?? null,
        updatedById: actor.id,
      },
      update: {
        isOpen: input.isOpen,
        opensAt: input.opensAt ?? null,
        closesAt: input.closesAt ?? null,
        updatedById: actor.id,
      },
    });
    await db.auditLog.create({
      data: {
        actorId: actor.id,
        action: input.isOpen ? "SSIP_OPENED" : "SSIP_CLOSED",
        entityType: "SSIP_SETTINGS",
        entityId: "default",
        metadata: { opensAt: input.opensAt?.toISOString() ?? null, closesAt: input.closesAt?.toISOString() ?? null },
      },
    });
    return Response.json({ settings });
  } catch (error) {
    return safeError(error, { route: "/api/admin/ssip/settings", method: "PATCH" });
  }
}
