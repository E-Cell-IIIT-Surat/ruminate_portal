import { db } from "@/lib/db";
import { hasDatabaseConfig } from "@/lib/env";

export async function publicPrograms() {
  if (!hasDatabaseConfig()) return [];
  return db.program.findMany({
    where: { visibility: "PUBLIC", archivedAt: null, status: { notIn: ["DRAFT", "ARCHIVED"] } },
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
    take: 30,
  });
}
