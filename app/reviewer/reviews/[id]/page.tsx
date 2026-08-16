import { auth } from "@/auth";
import { AuthGate } from "@/components/auth-gate";
import { ReviewForm } from "@/components/review-form";
import { Badge, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ReviewDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return <AuthGate />;
  const { id } = await params;
  const assignment = await db.reviewerAssignment.findFirst({
    where: { id, reviewerId: session.user.id },
    include: {
      evaluation: true,
      rubric: { include: { criteria: { orderBy: { order: "asc" } } } },
      application: {
        include: {
          program: true,
          user: { select: { name: true, email: true } },
          answers: { include: { field: { include: { section: true } } } },
          files: { where: { deletedAt: null } },
        },
      },
    },
  });
  if (!assignment) {
    return (
      <AuthGate title="Review unavailable" body="Reviewers can open only applications explicitly assigned to them." />
    );
  }
  const app = assignment.application;
  return (
    <>
      <PageHeader
        eyebrow={app.referenceId}
        title={app.program.blindReview ? "Blind review" : (app.user.name ?? app.user.email)}
        description={`${app.program.name} · ${assignment.rubric.name}`}
        action={<Badge tone={assignment.status === "COMPLETED" ? "green" : "orange"}>{assignment.status}</Badge>}
      />
      <div className="review-layout">
        <section className="panel response-panel">
          <div className="panel-header">
            <h2>Application responses</h2>
          </div>
          {app.answers.map((answer) => (
            <div className="response-row" key={answer.id}>
              <small>
                {answer.field.section.title} · {answer.field.label}
              </small>
              <p>{Array.isArray(answer.value) ? answer.value.join(", ") : String(answer.value)}</p>
            </div>
          ))}
          {app.files.length > 0 && (
            <div className="response-row">
              <small>Private documents</small>
              {app.files.map((file) => (
                <p key={file.id}>
                  <a href={`/api/files/${file.id}/download`}>{file.originalFilename}</a>
                </p>
              ))}
            </div>
          )}
        </section>
        <ReviewForm
          assignmentId={assignment.id}
          submitted={assignment.status === "COMPLETED"}
          criteria={assignment.rubric.criteria.map((criterion) => ({
            id: criterion.id,
            name: criterion.name,
            description: criterion.description,
            maxScore: criterion.maxScore.toNumber(),
            weight: criterion.weight.toNumber(),
          }))}
        />
      </div>
    </>
  );
}
