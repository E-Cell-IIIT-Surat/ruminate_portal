import { auth } from "@/auth";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { Lightbulb } from "lucide-react";
import { userAuthorization } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function ReviewerUdbhavPage() {
  const session = await auth();
  if (!session?.user) return null;
  const authorization = await userAuthorization(session.user.id);
  const submissions = await db.udbhavSubmission.findMany({
    where: {
      status: { notIn: ["DRAFT", "REJECTED"] },
      ...(authorization.isSuperAdmin
        ? {}
        : { reviewerAssignments: { some: { reviewerId: session.user.id, status: { not: "RECUSED" } } } }),
    },
    include: {
      leader: { select: { name: true, email: true } },
      reviews: { where: { reviewerId: session.user.id }, select: { totalScore: true, feedback: true } },
    },
    orderBy: { submittedAt: "desc" },
    take: 100,
  });
  return (
    <>
      <PageHeader
        eyebrow="UdbhAV evaluation"
        title="Idea review queue"
        description="Score the ten dimensions consistently and leave feedback the program team can act on."
      />
      <div className="panel">
        {submissions.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Idea</th>
                  <th>Leader</th>
                  <th>Status</th>
                  <th>Your score</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.title}</strong>
                      <br />
                      <small>
                        {item.referenceId} · {item.teamName}
                      </small>
                    </td>
                    <td>{item.leader.name ?? item.leader.email}</td>
                    <td>
                      <Badge tone={item.status === "ACCEPTED" ? "green" : "orange"}>
                        {item.status.replaceAll("_", " ")}
                      </Badge>
                    </td>
                    <td>{item.reviews[0]?.totalScore?.toString() ?? "Not scored"}</td>
                    <td>
                      <a className="button button-secondary" href={`/reviewer/udbhav/${item.id}`}>
                        {item.reviews.length ? "Update review" : "Review idea"}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Lightbulb}
            title="No UdbhAV ideas to review"
            body="Ideas will appear here after participants submit during an open cycle."
          />
        )}
      </div>
    </>
  );
}
