import { z } from "zod";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";

const optionalDate = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.date().optional(),
);
const optionalPositiveInt = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().int().positive().optional(),
);

const workshopSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens"),
    name: z.string().trim().min(3).max(160),
    summary: z.string().trim().min(10).max(240),
    description: z.string().trim().min(20).max(10000),
    bannerUrl: z.string().trim().url("Use a complete banner image URL").optional().or(z.literal("")),
    batch: z.string().trim().max(80).optional().or(z.literal("")),
    year: z.string().trim().max(20).optional().or(z.literal("")),
    venue: z.string().trim().max(180).optional().or(z.literal("")),
    capacity: optionalPositiveInt,
    startsAt: optionalDate,
    endsAt: optionalDate,
    registrationOpenAt: optionalDate,
    registrationCloseAt: optionalDate,
    status: z.enum(["DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"]).default("DRAFT"),
  })
  .superRefine((value, context) => {
    if (value.registrationOpenAt && value.registrationCloseAt && value.registrationOpenAt >= value.registrationCloseAt)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["registrationCloseAt"],
        message: "Registration close must be after open",
      });
    if (value.startsAt && value.endsAt && value.startsAt >= value.endsAt)
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "Workshop end must be after start" });
  });

export async function GET() {
  try {
    const workshops = await db.workshop.findMany({
      where: { archivedAt: null },
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
    });
    return Response.json({ workshops });
  } catch (error) {
    return safeError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("program:create");
    const input = workshopSchema.parse(await request.json());
    const workshop = await db.workshop.create({
      data: {
        ...input,
        createdById: actor.id,
        batch: input.batch || null,
        year: input.year || null,
        venue: input.venue || null,
        bannerUrl: input.bannerUrl || null,
      },
    });
    await db.auditLog.create({
      data: {
        actorId: actor.id,
        action: "workshop.create",
        entityType: "Workshop",
        entityId: workshop.id,
        metadata: { slug: workshop.slug },
      },
    });
    return Response.json({ workshop }, { status: 201 });
  } catch (error) {
    return safeError(error);
  }
}
