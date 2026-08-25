import { auth } from "@/auth";
import { AuthGate } from "@/components/auth-gate";
import { PortalShell } from "@/components/portal-shell";
import { Badge, ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { hasDatabaseConfig } from "@/lib/env";
import { ClipboardList } from "lucide-react";
import { participantVisibleStatus } from "@/lib/domain/status";
import type { Session } from "next-auth";

export const dynamic = "force-dynamic";

function applicationsQuery(userId: string) {
  return db.application.findMany({
    where: { userId, archivedAt: null },
    include: {
      program: { select: { name: true, slug: true, resultsPublishedAt: true } },
      team: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export default async function ApplicationsPage() {
  if (!hasDatabaseConfig()) return <AuthGate title="Portal setup required" />;
  let session: Session | null;
  try {
    session = await auth();
  } catch (error) {
    console.error("[applications] authentication check failed", error);
    return <AuthGate title="Portal temporarily unavailable" body="The live auth service could not be reached." />;
  }
  if (!session?.user) return <AuthGate />;
  let applications: Awaited<ReturnType<typeof applicationsQuery>> = [];
  try {
    applications = await applicationsQuery(session.user.id);
  } catch (error) {
    console.error("[applications] database read failed", error);
    return (
      <AuthGate
        title="Applications temporarily unavailable"
        body="The portal could not read applications from the production database."
      />
    );
  }
  return (
    <PortalShell mode="participant" title="Participant portal" user={session.user}>
      <PageHeader
        eyebrow="Applications"
        title="My applications"
        description="Drafts, submitted applications, and results."
        action={<ButtonLink href="/programs">Start application</ButtonLink>}
      />
      <div className="panel">
        {applications.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Program</th>
                  <th>Applicant / Team</th>
                  <th>Last updated</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <a href={`/applications/${item.id}`}>{item.referenceId}</a>
                    </td>
                    <td>{item.program.name}</td>
                    <td>{item.team?.name ?? session.user.name ?? session.user.email}</td>
                    <td>{item.updatedAt.toLocaleDateString("en-IN")}</td>
                    <td>
                      <Badge tone="orange">
                        {participantVisibleStatus(item.status, item.program.resultsPublishedAt).replaceAll("_", " ")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No applications yet"
            body="Explore current programs and begin when you're ready."
            action={
              <ButtonLink href="/programs" variant="secondary">
                Explore programs
              </ButtonLink>
            }
          />
        )}
      </div>
    </PortalShell>
  );
}
