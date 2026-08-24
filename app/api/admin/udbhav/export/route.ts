import { requireUdbhavAdmin } from "@/lib/udbhav";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";

function csv(value: unknown) {
  return `"${String(value ?? "")
    .replaceAll('"', '""')
    .replaceAll("\n", " ")}"`;
}

export async function GET() {
  try {
    await requireUdbhavAdmin();
    const submissions = await db.udbhavSubmission.findMany({
      include: { cycle: true, leader: { select: { name: true, email: true, phone: true } }, reviews: true },
      orderBy: { createdAt: "desc" },
    });
    const headers = [
      "Reference",
      "Cycle",
      "Leader",
      "Leader email",
      "Phone",
      "Team",
      "Team members",
      "Title",
      "Challenge",
      "Proposal",
      "Solution",
      "Technology",
      "Estimated budget",
      "Distribution plan",
      "Milestones",
      "Status",
      "Stage",
      "Total score",
      "Review count",
      "Submitted at",
    ];
    const rows = submissions.map((item) => [
      item.referenceId,
      `${item.cycle.year}-${String(item.cycle.month).padStart(2, "0")}`,
      item.leader.name,
      item.leader.email,
      item.leader.phone,
      item.teamName,
      JSON.stringify(item.teamMembers),
      item.title,
      item.challenge,
      item.proposal,
      item.solution,
      item.technology,
      item.estimatedBudget?.toString(),
      item.distributionPlan,
      item.milestones,
      item.status,
      item.currentStage,
      item.totalScore?.toString(),
      item.reviews.length,
      item.submittedAt?.toISOString(),
    ]);
    const body = [headers, ...rows].map((row) => row.map(csv).join(",")).join("\r\n");
    return new Response(`\uFEFF${body}`, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="udbhav-submissions-${new Date().toISOString().slice(0, 10)}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return safeError(error);
  }
}
