import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";

const csv = (value: unknown) => {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requirePermission("application:export", id);
    await enforceRateLimit(`application-export:${actor.id}:${id}`, 5, 60);
    const applications = await db.application.findMany({
      where: { programId: id },
      include: {
        user: { select: { name: true, email: true } },
        team: { select: { name: true } },
        answers: { include: { field: { select: { key: true, label: true } } } },
      },
      orderBy: { createdAt: "asc" },
      take: 10000,
    });
    const fields = [
      ...new Map(
        applications.flatMap((item) => item.answers.map(({ field }) => [field.key, field.label] as const)),
      ).entries(),
    ];
    const rows = [
      ["Application ID", "Applicant", "Email", "Team", "Status", ...fields.map(([, label]) => label)],
      ...applications.map((item) => {
        const answers = new Map(
          item.answers.map(({ field, value }) => [field.key, Array.isArray(value) ? value.join("; ") : String(value)]),
        );
        return [
          item.referenceId,
          item.user.name ?? "",
          item.user.email,
          item.team?.name ?? "",
          item.status,
          ...fields.map(([key]) => answers.get(key) ?? ""),
        ];
      }),
    ];
    await db.auditLog.create({
      data: {
        actorId: actor.id,
        programId: id,
        action: "application.export",
        entityType: "Program",
        entityId: id,
        metadata: { rows: applications.length },
      },
    });
    return new Response(rows.map((row) => row.map(csv).join(",")).join("\r\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="applications-${id}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return safeError(error);
  }
}
