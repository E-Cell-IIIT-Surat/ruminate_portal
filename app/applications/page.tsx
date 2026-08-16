import { auth } from "@/auth";
import { AuthGate } from "@/components/auth-gate";
import { PortalShell } from "@/components/portal-shell";
import { Badge, ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { hasDatabaseConfig } from "@/lib/env";
import { ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";
export default async function ApplicationsPage() {
  if (!hasDatabaseConfig()) return <AuthGate title="Portal setup required" />;
  const session = await auth();
  if (!session?.user) return <AuthGate />;
  const applications = await db.application.findMany({
    where: { userId: session.user.id, archivedAt: null },
    include: { program: { select: { name: true, slug: true } }, team: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });
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
                      <Badge tone="orange">{item.status.replaceAll("_", " ")}</Badge>
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
