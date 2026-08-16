import { auth } from "@/auth";
import { AuthGate } from "@/components/auth-gate";
import { StatusControl } from "@/components/status-control";
import { Badge, PageHeader } from "@/components/ui";
import { userAuthorization } from "@/lib/authz";
import { db } from "@/lib/db";
import { ReviewerAssignment } from "@/components/reviewer-assignment";
import { ApplicationComments } from "@/components/application-comments";

export const dynamic = "force-dynamic";
export default async function AdminApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return <AuthGate />;
  const { id } = await params;
  const authorization = await userAuthorization(session.user.id);
  const application = await db.application.findFirst({
    where: { id, ...(authorization.isSuperAdmin ? {} : { programId: { in: [...authorization.managedProgramIds] } }) },
    include: {
      program: true,
      user: true,
      stage: true,
      team: { include: { members: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] } } },
      answers: { include: { field: { include: { section: true } } } },
      files: { where: { deletedAt: null } },
      reviewerAssignments: { include: { reviewer: { select: { name: true, email: true } }, evaluation: true } },
      statusHistory: { include: { changedBy: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      stageHistory: {
        include: { toStage: true, changedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      comments: { include: { author: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!application)
    return (
      <AuthGate
        title="Application unavailable"
        body="Program managers can open only applications within their assigned programs."
      />
    );
  const [reviewers, rubrics, stages] = await Promise.all([
    db.user.findMany({
      where: {
        archivedAt: null,
        roles: { some: { role: { name: { in: ["REVIEWER", "FACULTY_REVIEWER", "SUPER_ADMIN"] } } } },
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
    db.rubric.findMany({
      where: { programId: application.programId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.programStage.findMany({
      where: { programId: application.programId },
      select: { id: true, name: true },
      orderBy: { order: "asc" },
    }),
  ]);
  return (
    <>
      <PageHeader
        eyebrow={application.referenceId}
        title={application.team?.name ?? application.user.name ?? application.user.email}
        description={`${application.program.name} · ${application.stage?.name ?? "No stage"}`}
        action={<Badge tone="orange">{application.status.replaceAll("_", " ")}</Badge>}
      />
      <nav className="tabs">
        <span className="active">Overview</span>
        <a href="#responses">Responses</a>
        <a href="#team">Team</a>
        <a href="#documents">Documents</a>
        <a href="#reviews">Reviews</a>
        <a href="#history">History</a>
      </nav>
      <div className="admin-application-grid">
        <section>
          <div className="panel" id="responses">
            <div className="panel-header">
              <h2>Responses</h2>
            </div>
            {application.answers.map((answer) => (
              <div className="response-row" key={answer.id}>
                <small>
                  {answer.field.section.title} · {answer.field.label}
                </small>
                <p>{Array.isArray(answer.value) ? answer.value.join(", ") : String(answer.value)}</p>
              </div>
            ))}
          </div>
          {application.team && (
            <div className="panel" id="team">
              <div className="panel-header">
                <h2>Team · {application.team.name}</h2>
              </div>
              <div className="compact-list">
                {application.team.members.map((member) => (
                  <div key={member.id}>
                    <strong>
                      {member.name}
                      {member.isLeader ? " · Leader" : ""}
                    </strong>
                    <small>
                      {member.email} · {member.institution ?? "Institution not provided"}
                      {member.role ? ` · ${member.role}` : ""}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="panel" id="reviews">
            <div className="panel-header">
              <h2>Reviews</h2>
            </div>
            <div className="compact-list">
              {application.reviewerAssignments.map((assignment) => (
                <div key={assignment.id}>
                  <strong>{assignment.reviewer.name ?? assignment.reviewer.email}</strong>
                  <small>
                    {assignment.status} · {assignment.evaluation?.totalScore?.toNumber() ?? "No score"}
                  </small>
                </div>
              ))}
            </div>
            <ReviewerAssignment applicationId={application.id} reviewers={reviewers} rubrics={rubrics} />
          </div>
          <div className="panel" id="comments">
            <div className="panel-header">
              <h2>Comments</h2>
            </div>
            <div className="compact-list">
              {application.comments.map((comment) => (
                <div key={comment.id}>
                  <strong>{comment.author.name ?? comment.author.email}</strong>
                  <small>
                    {comment.visibility} · {comment.createdAt.toLocaleString("en-IN")}
                  </small>
                  <p>{comment.body}</p>
                </div>
              ))}
            </div>
            <ApplicationComments applicationId={application.id} allowApplicant />
          </div>
        </section>
        <aside>
          <div className="panel side-panel">
            <div className="panel-header">
              <h2>Change status</h2>
            </div>
            <StatusControl
              applicationId={application.id}
              current={application.status}
              currentStageId={application.stageId}
              stages={stages}
            />
          </div>
          <div className="panel" id="documents">
            <div className="panel-header">
              <h2>Private documents</h2>
            </div>
            <div className="compact-list">
              {application.files.map((file) => (
                <a key={file.id} href={`/api/files/${file.id}/download`}>
                  <strong>{file.originalFilename}</strong>
                  <small>
                    {file.mimeType} · {(file.size / 1024 / 1024).toFixed(1)} MB
                  </small>
                </a>
              ))}
            </div>
          </div>
          <div className="panel" id="history">
            <div className="panel-header">
              <h2>History</h2>
            </div>
            <div className="compact-list">
              {application.statusHistory.map((event) => (
                <div key={event.id}>
                  <strong>{event.toStatus.replaceAll("_", " ")}</strong>
                  <small>
                    {event.changedBy?.name ?? "System"} · {event.createdAt.toLocaleString("en-IN")}
                  </small>
                </div>
              ))}
              {application.stageHistory.map((event) => (
                <div key={event.id}>
                  <strong>Moved to {event.toStage.name}</strong>
                  <small>
                    {event.changedBy?.name ?? "System"} · {event.createdAt.toLocaleString("en-IN")}
                  </small>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
