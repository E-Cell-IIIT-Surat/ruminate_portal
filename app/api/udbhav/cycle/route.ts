import { z } from "zod";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";
import { defaultUdbhavWindow, requireUdbhavAdmin } from "@/lib/udbhav";

const cycleSchema = z
  .object({
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int().min(2025).max(2100),
    opensAt: z.coerce.date(),
    closesAt: z.coerce.date(),
    status: z.enum(["SCHEDULED", "OPEN", "CLOSED"]),
  })
  .superRefine((value, context) => {
    if (value.opensAt >= value.closesAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["closesAt"],
        message: "Closing time must be after opening time",
      });
    }
  });

export async function GET() {
  try {
    const window = defaultUdbhavWindow();
    const configured = await db.udbhavCycle.findUnique({
      where: { year_month: { year: window.year, month: window.month } },
    });
    const now = new Date();
    const opensAt = configured?.opensAt ?? window.opensAt;
    const closesAt = configured?.closesAt ?? window.closesAt;
    const inWindow = now >= opensAt && now <= closesAt;
    const effectiveStatus =
      configured?.status === "CLOSED"
        ? "CLOSED"
        : configured?.status === "OPEN" || inWindow
          ? "OPEN"
          : now > closesAt
            ? "CLOSED"
            : "SCHEDULED";
    return Response.json({
      cycle: configured ?? { ...window, status: effectiveStatus, configured: false },
      open: effectiveStatus === "OPEN" && (configured?.status === "OPEN" || inWindow),
    });
  } catch (error) {
    return safeError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { current } = await requireUdbhavAdmin();
    const input = cycleSchema.parse(await request.json());
    const cycle = await db.udbhavCycle.upsert({
      where: { year_month: { year: input.year, month: input.month } },
      create: { ...input, managedById: current.id },
      update: { ...input, managedById: current.id },
    });
    await db.auditLog.create({
      data: {
        actorId: current.id,
        action: "udbhav.cycle.update",
        entityType: "UdbhavCycle",
        entityId: cycle.id,
        metadata: input,
      },
    });
    return Response.json({ cycle });
  } catch (error) {
    return safeError(error);
  }
}
