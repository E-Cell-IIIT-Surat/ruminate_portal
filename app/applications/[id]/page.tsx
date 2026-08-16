import { auth } from "@/auth";
import { AuthGate } from "@/components/auth-gate";
import { ApplicationForm } from "@/components/application-form";
import { PortalShell } from "@/components/portal-shell";
import { Badge, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { hasDatabaseConfig } from "@/lib/env";
import { canEditSubmitted } from "@/lib/domain/program";
import { participantVisibleStatus } from "@/lib/domain/status";
import { WithdrawApplication } from "@/components/withdraw-application";
import { TeamEditor } from "@/components/team-editor";

export const dynamic = "force-dynamic";
export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  if (!hasDatabaseConfig()) return <AuthGate title="Portal setup required" />;
  const session = await auth();
  if (!session?.user) return <AuthGate />;
  const { id } = await params;
  const application = await db.application.findFirst({
    where: { id, userId: session.user.id },
    include: {
      program: true,
      answers: { include: { field: true } },
      files: { where: { deletedAt: null }, select: { id: true, fieldId: true, originalFilename: true } },
      team: { include: { members: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] } } },
      comments: {
        where: { visibility: "APPLICANT" },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      formVersion: {
        include: {
          sections: {
            orderBy: { order: "asc" },
            include: { fields: { where: { archivedAt: null }, orderBy: { order: "asc" } } },
          },
        },
      },
    },
  });
  if (!application)
    return (
      <AuthGate title="Application unavailable" body="This application does not belong to your signed-in account." />
    );
  const locked =
    !["DRAFT", "CHANGES_REQUESTED"].includes(application.status) &&
    !canEditSubmitted(application.program, application.editOverrideUntil);
  const initialAnswers = Object.fromEntries(application.answers.map((answer) => [answer.field.key, answer.value]));
  const visibleStatus = participantVisibleStatus(application.status, application.program.resultsPublishedAt);
  return (
    <PortalShell mode="participant" title="Participant portal" user={session.user}>
      <PageHeader
        eyebrow={application.referenceId}
        title={application.program.name}
        description={`Form version ${application.formVersion.version} · Last saved ${application.lastSavedAt.toLocaleString("en-IN")}`}
        action={
          <Badge tone={visibleStatus === "DRAFT" ? "neutral" : "orange"}>{visibleStatus.replaceAll("_", " ")}</Badge>
        }
      />
      <ApplicationForm
        applicationId={application.id}
        sections={application.formVersion.sections}
        initialAnswers={initialAnswers}
        locked={locked}
        initialFiles={application.files}
      />
      {application.program.participationMode !== "INDIVIDUAL" && (
        <TeamEditor
          applicationId={application.id}
          initialName={application.team?.name ?? ""}
          initialMembers={
            application.team?.members.map((member) => ({
              name: member.name,
              email: member.email,
              phone: member.phone ?? undefined,
              institution: member.institution ?? undefined,
              role: member.role ?? undefined,
              isLeader: member.isLeader,
            })) ?? [
              { name: session.user.name ?? "", email: session.user.email ?? "", role: "Team leader", isLeader: true },
            ]
          }
          min={application.program.teamMinSize}
          max={application.program.teamMaxSize}
          locked={locked}
        />
      )}
      {application.comments.length > 0 && (
        <section className="panel">
          <div className="panel-header">
            <h2>Feedback</h2>
          </div>
          <div className="compact-list">
            {application.comments.map((comment) => (
              <div key={comment.id}>
                <strong>{comment.author.name ?? "Program team"}</strong>
                <small>{comment.createdAt.toLocaleString("en-IN")}</small>
                <p>{comment.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}
      {application.program.allowsWithdrawal &&
        ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "SHORTLISTED", "WAITLISTED", "CONFIRMED"].includes(
          application.status,
        ) && <WithdrawApplication applicationId={application.id} />}
    </PortalShell>
  );
}
