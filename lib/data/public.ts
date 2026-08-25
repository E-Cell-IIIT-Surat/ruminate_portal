import { db } from "@/lib/db";
import { hasDatabaseConfig } from "@/lib/env";
import { registrationState } from "@/lib/domain/program";

export async function publicPrograms(filters: { type?: string; state?: string; year?: number } = {}) {
  if (!hasDatabaseConfig()) return [];
  try {
    const programs = await db.program.findMany({
      where: {
        visibility: "PUBLIC",
        archivedAt: null,
        status: { notIn: ["DRAFT", "ARCHIVED"] },
        ...(filters.type ? { type: filters.type as never } : {}),
        ...(filters.year
          ? {
              startAt: {
                gte: new Date(`${filters.year}-01-01T00:00:00.000Z`),
                lt: new Date(`${filters.year + 1}-01-01T00:00:00.000Z`),
              },
            }
          : {}),
      },
      select: {
        id: true,
        slug: true,
        name: true,
        shortDescription: true,
        type: true,
        status: true,
        registrationOpenAt: true,
        registrationCloseAt: true,
        startAt: true,
        capacity: true,
        participationMode: true,
      },
      orderBy: [{ registrationCloseAt: "asc" }, { createdAt: "desc" }],
      take: 100,
    });
    return filters.state ? programs.filter((program) => registrationState(program) === filters.state) : programs;
  } catch (error) {
    console.error("[publicPrograms] database read failed", error);
    return [];
  }
}
