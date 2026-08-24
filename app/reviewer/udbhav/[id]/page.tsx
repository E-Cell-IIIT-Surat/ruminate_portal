import { AuthGate } from "@/components/auth-gate";
import { UdbhavReviewForm } from "@/components/udbhav-review-form";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { requireUdbhavViewer } from "@/lib/udbhav";

export const dynamic = "force-dynamic";

export default async function ReviewerUdbhavDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let viewer: Awaited<ReturnType<typeof requireUdbhavViewer>>;
  try {
    viewer = await requireUdbhavViewer(id);
  } catch {
    return <AuthGate title="Idea unavailable" body="You do not have access to this UdbhAV idea." />;
  }
  const submission = await db.udbhavSubmission.findUnique({
    where: { id: viewer.submission.id },
    include: { cycle: true, reviews: { where: { reviewerId: viewer.current.id } } },
  });
  if (!submission) return <AuthGate title="Idea unavailable" body="This UdbhAV idea could not be found." />;
  const review = submission.reviews[0];
  const initialReview = review
    ? {
        creativity: review.creativity.toNumber(),
        problemUnderstanding: review.problemUnderstanding.toNumber(),
        innovation: review.innovation.toNumber(),
        execution: review.execution.toNumber(),
        feasibility: review.feasibility.toNumber(),
        scalability: review.scalability.toNumber(),
        impact: review.impact.toNumber(),
        sustainability: review.sustainability.toNumber(),
        presentation: review.presentation.toNumber(),
        completeness: review.completeness.toNumber(),
        feedback: review.feedback,
      }
    : undefined;
  return (
    <>
      <PageHeader
        eyebrow={submission.referenceId}
        title={submission.title}
        description={`${submission.teamName} · ${submission.currentStage}`}
      />
      <section className="panel response-panel">
        <div className="response-row">
          <small>Challenge</small>
          <p>{submission.challenge}</p>
        </div>
        <div className="response-row">
          <small>Proposal</small>
          <p>{submission.proposal}</p>
        </div>
        <div className="response-row">
          <small>Solution and technology</small>
          <p>
            {submission.solution}
            <br />
            <br />
            {submission.technology}
          </p>
        </div>
        <div className="response-row">
          <small>Budget and distribution</small>
          <p>
            ₹{submission.estimatedBudget?.toString() ?? "0"}
            <br />
            {submission.distributionPlan}
          </p>
        </div>
      </section>
      <UdbhavReviewForm submissionId={submission.id} initial={initialReview} />
    </>
  );
}
