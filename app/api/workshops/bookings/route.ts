import { z } from "zod";
import { db } from "@/lib/db";
import { AppError, safeError } from "@/lib/errors";

const bookingSchema = z.object({
  workshopId: z.string().trim().min(2).max(100).default("financial-literacy"),
  name: z.string().trim().min(2).max(120),
  batch: z.string().trim().min(1).max(80),
  year: z
    .string()
    .trim()
    .regex(/^20\d{2}$/, "Enter a valid academic year"),
  email: z.string().trim().email().max(255),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s().-]{7,24}$/, "Enter a valid phone number"),
  studentId: z.string().trim().max(80).optional().or(z.literal("")),
  department: z.string().trim().max(120).optional().or(z.literal("")),
  reason: z.string().trim().max(600).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  try {
    const input = bookingSchema.parse(await request.json());
    const workshop = await db.workshop.findFirst({
      where: { slug: input.workshopId, archivedAt: null },
      select: {
        id: true,
        slug: true,
        capacity: true,
        registrationOpenAt: true,
        registrationCloseAt: true,
        status: true,
      },
    });
    const workshopKey = workshop?.slug ?? (input.workshopId === "financial-literacy" ? "financial-literacy" : null);
    if (!workshopKey) throw new AppError("This workshop is not available", 404, "WORKSHOP_NOT_FOUND");
    if (workshop && workshop.status !== "PUBLISHED")
      return Response.json({ error: "Bookings are not open for this workshop" }, { status: 422 });
    const now = new Date();
    if (workshop?.registrationOpenAt && workshop.registrationOpenAt > now)
      return Response.json({ error: "Registration has not opened yet" }, { status: 422 });
    if (workshop?.registrationCloseAt && workshop.registrationCloseAt < now)
      return Response.json({ error: "Registration for this workshop has closed" }, { status: 422 });
    const booking = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`workshop:${workshopKey}`}))`;
      if (workshop?.capacity) {
        const count = await tx.workshopBooking.count({
          where: { workshop: workshopKey, status: { not: "CANCELLED" } },
        });
        if (count >= workshop.capacity) throw new AppError("This workshop is currently full", 409, "WORKSHOP_FULL");
      }
      return tx.workshopBooking.create({
        data: {
          workshop: workshopKey,
          workshopId: workshop?.id ?? null,
          name: input.name,
          batch: input.batch,
          year: input.year,
          email: input.email.toLowerCase(),
          phone: input.phone,
          studentId: input.studentId || null,
          department: input.department || null,
          reason: input.reason || null,
        },
        select: { id: true, name: true, email: true, status: true, createdAt: true },
      });
    });
    return Response.json({ booking }, { status: 201 });
  } catch (error) {
    return safeError(error);
  }
}
