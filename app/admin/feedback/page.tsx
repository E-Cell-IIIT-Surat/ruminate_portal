import { MessageSquare } from "lucide-react";
import type { FeedbackType } from "@prisma/client";
import { PageHeader, EmptyState, Badge } from "@/components/ui";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const labels: Record<FeedbackType, string> = { BUG: "Bug", SUGGESTION: "Suggestion", OTHER: "Other" };

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await requirePermission("program:update");
  const { type } = await searchParams;
  const filter = type === "BUG" || type === "SUGGESTION" || type === "OTHER" ? type : undefined;
  const feedback = await db.feedback.findMany({
    where: filter ? { type: filter } : undefined,
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <>
      <PageHeader
        eyebrow="Product signals"
        title="Feedback"
        description="Bug reports and suggestions shared by participants and visitors, newest first."
      />
      <form className="filter-bar" method="get">
        <select name="type" defaultValue={filter ?? ""} aria-label="Filter feedback by type">
          <option value="">All feedback</option>
          <option value="BUG">Bugs</option>
          <option value="SUGGESTION">Suggestions</option>
          <option value="OTHER">Other</option>
        </select>
        <button className="button button-secondary" type="submit">
          Filter
        </button>
      </form>
      <div className="panel table-wrap feedback-table-wrap">
        {feedback.length === 0 ? (
          <EmptyState icon={MessageSquare} title="No feedback yet" body="Signals from your users will appear here." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Received</th>
                <th>Type</th>
                <th>From</th>
                <th>Page</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {feedback.map((item) => (
                <tr key={item.id}>
                  <td>{item.createdAt.toLocaleString("en-IN")}</td>
                  <td>
                    <Badge tone={item.type === "BUG" ? "red" : item.type === "SUGGESTION" ? "blue" : "neutral"}>
                      {labels[item.type]}
                    </Badge>
                  </td>
                  <td>
                    {item.user?.name ?? item.email ?? "Anonymous"}
                    <br />
                    <small>{item.user?.email ?? item.email ?? ""}</small>
                  </td>
                  <td>{item.pagePath ?? "—"}</td>
                  <td className="feedback-message-cell">{item.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
