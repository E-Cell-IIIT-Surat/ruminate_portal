import { auth } from "@/auth";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { userAuthorization } from "@/lib/authz";
import { db } from "@/lib/db";
import { FileCheck2 } from "lucide-react";

export const dynamic = "force-dynamic";
export default async function AdminReviewsPage() {
  const session = await auth();
  if (!session?.user) return null;
  const authorization = await userAuthorization(session.user.id);
  const scope = authorization.isSuperAdmin ? {} : { programId: { in: [...authorization.managedProgramIds] } };
  const assignments = await db.reviewerAssignment.findMany({
    where: { application: scope },
    include: {
      reviewer: { select: { name: true, email: true } },
      application: { select: { id: true, referenceId: true, program: { select: { name: true } } } },
      rubric: { select: { name: true } },
      evaluation: { select: { totalScore: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <>
      <PageHeader
        eyebrow="Evaluation"
        title="Review operations"
        description="Assignments and completion across programs you manage."
      />
      <div className="panel">
        {assignments.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Application</th>
                  <th>Reviewer</th>
                  <th>Rubric</th>
                  <th>Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <a href={`/admin/applications/${item.application.id}`}>{item.application.referenceId}</a>
                      <br />
                      <small>{item.application.program.name}</small>
                    </td>
                    <td>{item.reviewer.name ?? item.reviewer.email}</td>
                    <td>{item.rubric.name}</td>
                    <td>{item.evaluation?.totalScore?.toNumber() ?? "—"}</td>
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
            title="No review assignments"
            body="Assign a reviewer from an application record."
          />
        )}
      </div>
    </>
  );
}
