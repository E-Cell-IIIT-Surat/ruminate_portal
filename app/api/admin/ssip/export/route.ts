import { db } from "@/lib/db";
import { requirePermission } from "@/lib/authz";
import { safeError } from "@/lib/errors";

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  try {
    await requirePermission("application:export");
    const rows = await db.sSIPSubmission.findMany({ orderBy: { createdAt: "desc" } });
    const headers = [
      "Reference",
      "Name",
      "Email",
      "Phone",
      "Institution",
      "Degree",
      "Study year",
      "Team",
      "Title",
      "Problem",
      "Solution",
      "Technology",
      "Estimated budget",
      "Impact",
      "Status",
      "Created at",
    ];
    const data = rows.map((row) => [
      row.referenceId,
      row.name,
      row.email,
      row.phone,
      row.institution,
      row.degree,
      row.studyYear,
      row.teamName,
      row.title,
      row.problemStatement,
      row.solution,
      row.technology,
      row.estimatedBudget?.toString(),
      row.impact,
      row.status,
      row.createdAt.toISOString(),
    ]);
    const csv = [headers, ...data].map((line) => line.map(csvCell).join(",")).join("\r\n");
    return new Response(`\uFEFF${csv}`, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="ssip-submissions-${new Date().toISOString().slice(0, 10)}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return safeError(error, { route: "/api/admin/ssip/export", method: "GET" });
  }
}
