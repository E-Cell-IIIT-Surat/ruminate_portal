import { requireUdbhavAdmin } from "@/lib/udbhav";
import { db } from "@/lib/db";
import { AuthGate } from "@/components/auth-gate";
import { Badge, PageHeader } from "@/components/ui";
import { UdbhavAdminDetail } from "@/components/udbhav-admin-detail";
import { UdbhavFileUpload } from "@/components/udbhav-file-upload";
import { UdbhavReviewerAssignment } from "@/components/udbhav-reviewer-assignment";

export const dynamic = "force-dynamic";

export default async function AdminUdbhavDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireUdbhavAdmin();
  const { id } = await params;
  const submission = await db.udbhavSubmission.findUnique({
    where: { id },
    include: {
      cycle: true,
      leader: { select: { name: true, email: true } },
      reviews: {
        include: { reviewer: { select: { name: true, email: true } } },
        orderBy: { updatedAt: "desc" },
      },
      reviewerAssignments: {
        include: { reviewer: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
      statusLog: {
        include: { changedBy: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!submission) return <AuthGate title="Idea unavailable" body="This UdbhAV idea could not be found." />;

  const reviewers = await db.user.findMany({
    where: {
      archivedAt: null,
      roles: { some: { role: { name: { in: ["REVIEWER", "FACULTY_REVIEWER", "SUPER_ADMIN"] } } } },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const members = Array.isArray(submission.teamMembers) ? submission.teamMembers : [];
  return (
    <>
      <PageHeader
        eyebrow={submission.referenceId}
        title={submission.title}
        description={`${submission.teamName} · ${submission.leader.name ?? submission.leader.email}`}
        action={
          <Badge tone={submission.status === "ACCEPTED" ? "green" : "orange"}>
            {submission.status.replaceAll("_", " ")}
          </Badge>
        }
      />
      <div className="admin-application-grid">
        <section>
          <div className="panel response-panel">
            <div className="panel-header">
              <h2>Idea details</h2>
              <span>
                {submission.cycle.month}/{submission.cycle.year}
              </span>
            </div>
            <div className="response-row">
              <small>Challenge</small>
              <p>{submission.challenge}</p>
            </div>
            <div className="response-row">
              <small>Proposal</small>
              <p>{submission.proposal}</p>
            </div>
            <div className="response-row">
              <small>Solution</small>
              <p>{submission.solution}</p>
            </div>
            <div className="response-row">
              <small>Technology used</small>
              <p>{submission.technology}</p>
            </div>
            <div className="response-row">
              <small>Estimated budget</small>
              <p>₹{submission.estimatedBudget?.toString() ?? "0"}</p>
            </div>
            <div className="response-row">
              <small>Distribution / go-to-market</small>
              <p>{submission.distributionPlan}</p>
            </div>
            <div className="response-row">
              <small>Milestones</small>
              <p>{submission.milestones}</p>
            </div>
          </div>
          <div className="panel">
            <div className="panel-header">
              <h2>Reviewers</h2>
              <span>{submission.reviewerAssignments.length} assigned</span>
            </div>
            <UdbhavReviewerAssignment
              submissionId={submission.id}
              reviewers={reviewers}
              initial={submission.reviewerAssignments}
            />
          </div>
          <div className="panel">
            <div className="panel-header">
              <h2>Team</h2>
              <span>{members.length + 1} member(s)</span>
            </div>
            <div className="compact-list">
              <div>
                <strong>{submission.leader.name ?? submission.leader.email} · Leader</strong>
                <small>{submission.leader.email}</small>
              </div>
              {members.map((member, index) => {
                const value = member as { name?: string; email?: string; role?: string };
                return (
                  <div key={`${value.email ?? "member"}-${index}`}>
                    <strong>{value.name ?? value.email}</strong>
                    <small>
                      {value.email} {value.role ? `· ${value.role}` : ""}
                    </small>
                  </div>
                );
              })}
            </div>
          </div>
          <UdbhavFileUpload submissionId={submission.id} hasFile={Boolean(submission.supportingFileKey)} />
          <div className="panel">
            <div className="panel-header">
              <h2>Reviewer scores</h2>
              <span>{submission.reviews.length} review(s)</span>
            </div>
            <div className="compact-list">
              {submission.reviews.length ? (
                submission.reviews.map((review) => (
                  <div key={review.id}>
                    <strong>
                      {review.reviewer.name ?? review.reviewer.email} · {review.totalScore.toString()}/100
                    </strong>
                    <small>{review.feedback ?? "No feedback"}</small>
                  </div>
                ))
              ) : (
                <p className="muted-copy">No reviewer score has been submitted yet.</p>
              )}
            </div>
          </div>
        </section>
        <aside>
          <UdbhavAdminDetail
            id={submission.id}
            status={submission.status}
            currentStage={submission.currentStage}
            secretMessage={submission.secretMessage}
          />
          <div className="panel">
            <div className="panel-header">
              <h2>Status history</h2>
            </div>
            <div className="compact-list">
              {submission.statusLog.map((event) => (
                <div key={event.id}>
                  <strong>{event.toStatus.replaceAll("_", " ")}</strong>
                  <small>
                    {event.changedBy?.name ?? event.changedBy?.email ?? "System"} ·{" "}
                    {event.createdAt.toLocaleString("en-IN")}
                  </small>
                  {event.reason ? <p>{event.reason}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
