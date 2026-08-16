import { auth } from "@/auth";
import { AuthGate } from "@/components/auth-gate";
import { ApplicationForm } from "@/components/application-form";
import { PortalShell } from "@/components/portal-shell";
import { Badge, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { hasDatabaseConfig } from "@/lib/env";
import { canEditSubmitted } from "@/lib/domain/program";

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
  return (
    <PortalShell mode="participant" title="Participant portal" user={session.user}>
      <PageHeader
        eyebrow={application.referenceId}
        title={application.program.name}
        description={`Form version ${application.formVersion.version} · Last saved ${application.lastSavedAt.toLocaleString("en-IN")}`}
        action={
          <Badge tone={application.status === "DRAFT" ? "neutral" : "orange"}>
            {application.status.replaceAll("_", " ")}
          </Badge>
        }
      />
      <ApplicationForm
        applicationId={application.id}
        sections={application.formVersion.sections}
        initialAnswers={initialAnswers}
        locked={locked}
        initialFiles={application.files}
      />
    </PortalShell>
  );
}
