import { z } from "zod";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";

const schema = z.object({
  title: z.string().min(3).max(160),
  body: z.string().min(5).max(10000),
  publishedAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
});
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requirePermission("announcement:create", id);
    const input = schema.parse(await request.json());
    const announcement = await db.announcement.create({
      data: {
        programId: id,
        createdById: actor.id,
        title: input.title,
        body: input.body,
        publishedAt: input.publishedAt ?? new Date(),
        expiresAt: input.expiresAt,
      },
    });
    const applicants = await db.application.findMany({
      where: { programId: id, status: { not: "DRAFT" } },
      distinct: ["userId"],
      select: { userId: true },
    });
    if (applicants.length)
      await db.notification.createMany({
        data: applicants.map(({ userId }) => ({
          userId,
          type: "ANNOUNCEMENT",
          title: input.title,
          body: input.body.slice(0, 240),
          href: "/dashboard",
        })),
      });
    await db.auditLog.create({
      data: {
        actorId: actor.id,
        programId: id,
        action: "announcement.create",
        entityType: "Announcement",
        entityId: announcement.id,
      },
    });
    return Response.json({ announcement }, { status: 201 });
  } catch (error) {
    return safeError(error);
  }
}
