import { auth } from "@/auth";
import { AuthGate } from "@/components/auth-gate";
import { Badge, PageHeader } from "@/components/ui";
import { PortalShell } from "@/components/portal-shell";
import { db } from "@/lib/db";
import { UdbhavFileUpload } from "@/components/udbhav-file-upload";

export const dynamic = "force-dynamic";

export default async function UdbhavSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return <AuthGate />;
  const { id } = await params;
  const submission = await db.udbhavSubmission.findFirst({
    where: { id, leaderId: session.user.id },
    include: {
      cycle: true,
      reviews: { select: { totalScore: true } },
      statusLog: { orderBy: { createdAt: "desc" }, include: { changedBy: { select: { name: true } } } },
    },
  });
  if (!submission)
    return <AuthGate title="Idea unavailable" body="This UdbhAV idea does not belong to your account." />;
  return (
    <PortalShell mode="participant" title="Participant portal" user={session.user}>
      <PageHeader
        eyebrow={submission.referenceId}
        title={submission.title}
        description={`${submission.teamName} · UdbhAV ${submission.cycle.year}`}
        action={
          <Badge
            tone={submission.status === "ACCEPTED" ? "green" : submission.status === "REJECTED" ? "red" : "orange"}
          >
            {submission.status.replaceAll("_", " ")}
          </Badge>
        }
      />
      <div className="metric-grid">
        <article className="metric-card">
          <span>Current stage</span>
          <strong>{submission.currentStage}</strong>
        </article>
        <article className="metric-card">
          <span>Total points</span>
          <strong>{submission.totalScore?.toString() ?? "Pending"}</strong>
          <small>Average of reviewer scores out of 100</small>
        </article>
        <article className="metric-card">
          <span>Last updated</span>
          <strong>{submission.updatedAt.toLocaleDateString("en-IN")}</strong>
        </article>
      </div>
      {submission.secretMessage && (
        <section className="panel private-update">
          <span className="eyebrow">Private update for team leader</span>
          <h2>Message from the program team</h2>
          <p>{submission.secretMessage}</p>
        </section>
      )}
      <section className="panel response-panel">
        <div className="panel-header">
          <h2>Proposal snapshot</h2>
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
          <small>Technology</small>
          <p>{submission.technology}</p>
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
      <UdbhavFileUpload submissionId={submission.id} hasFile={Boolean(submission.supportingFileKey)} />
      <section className="panel">
        <div className="panel-header">
          <h2>Live progress</h2>
        </div>
        <div className="compact-list">
          {submission.statusLog.map((event) => (
            <div key={event.id}>
              <strong>
                {event.toStatus.replaceAll("_", " ")} · {event.stage ?? submission.currentStage}
              </strong>
              <small>
                {event.createdAt.toLocaleString("en-IN")} · {event.changedBy.name ?? "Program team"}
              </small>
              {event.reason && <p>{event.reason}</p>}
            </div>
          ))}
        </div>
      </section>
    </PortalShell>
  );
}
