import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Badge, EmptyState, Metric, PageHeader } from "@/components/ui";
import { FileCheck2 } from "lucide-react";

export const dynamic = "force-dynamic";
export default async function ReviewerDashboard({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const session = await auth();
  if (!session?.user) return null;
  const { view } = await searchParams;
  const assignments = await db.reviewerAssignment.findMany({
    where: {
      reviewerId: session.user.id,
      ...(view === "completed"
        ? { status: "COMPLETED" }
        : view === "pending"
          ? { status: { in: ["ASSIGNED", "IN_PROGRESS"] } }
          : {}),
    },
    select: {
      id: true,
      status: true,
      dueAt: true,
      application: {
        select: {
          id: true,
          referenceId: true,
          submittedAt: true,
          program: { select: { name: true, blindReview: true } },
        },
      },
      rubric: { select: { name: true } },
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    take: 50,
  });
  const completed = assignments.filter((item) => item.status === "COMPLETED").length;
  return (
    <>
      <PageHeader
        eyebrow="Evaluation"
        title="Reviewer dashboard"
        description="Only applications explicitly assigned to you are visible."
      />
      <div className="metric-grid">
        <Metric label="Assigned" value={assignments.length} />
        <Metric label="Completed" value={completed} />
        <Metric label="Pending" value={assignments.length - completed} />
        <Metric
          label="Completion"
          value={assignments.length ? `${Math.round((completed / assignments.length) * 100)}%` : "0%"}
        />
      </div>
      <div className="panel">
        <div className="panel-header">
          <h2>{view === "completed" ? "Completed reviews" : "Assigned applications"}</h2>
        </div>
        {assignments.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Application</th>
                  <th>Program</th>
                  <th>Rubric</th>
                  <th>Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <a href={`/reviewer/reviews/${item.id}`}>
                        {item.application.program.blindReview
                          ? item.application.referenceId
                          : item.application.referenceId}
                      </a>
                    </td>
                    <td>{item.application.program.name}</td>
                    <td>{item.rubric.name}</td>
                    <td>{item.dueAt?.toLocaleDateString("en-IN") ?? "—"}</td>
                    <td>
                      <Badge tone={item.status === "COMPLETED" ? "green" : "orange"}>
                        {item.status.replaceAll("_", " ")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={FileCheck2}
            title="No reviews in this view"
            body="New assignments will appear here when a program manager sends them."
          />
        )}
      </div>
    </>
  );
}
