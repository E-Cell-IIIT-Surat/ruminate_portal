import { auth } from "@/auth";
import { userAuthorization } from "@/lib/authz";
import { db } from "@/lib/db";
import { Badge, ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { Blocks } from "lucide-react";

export const dynamic = "force-dynamic";
export default async function AdminProgramsPage() {
  const session = await auth();
  if (!session?.user) return null;
  const authorization = await userAuthorization(session.user.id);
  const programs = await db.program.findMany({
    where: authorization.isSuperAdmin ? {} : { id: { in: [...authorization.managedProgramIds] } },
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      status: true,
      registrationCloseAt: true,
      _count: { select: { applications: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return (
    <>
      <PageHeader
        eyebrow="Program engine"
        title="Programs"
        description="Configure registration, forms, stages, evaluation, and communication."
        action={
          authorization.grants.has("program:create") ? (
            <ButtonLink href="/admin/programs/new">Create program</ButtonLink>
          ) : undefined
        }
      />
      <div className="panel">
        {programs.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Program</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Applications</th>
                  <th>Registration closes</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((program) => (
                  <tr key={program.id}>
                    <td>
                      <a href={`/admin/programs/${program.id}`}>{program.name}</a>
                    </td>
                    <td>{program.type.replaceAll("_", " ")}</td>
                    <td>
                      <Badge tone={program.status === "REGISTRATION_OPEN" ? "green" : "neutral"}>
                        {program.status.replaceAll("_", " ")}
                      </Badge>
                    </td>
                    <td>{program._count.applications}</td>
                    <td>{program.registrationCloseAt?.toLocaleString("en-IN") ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Blocks}
            title="No programs yet"
            body="Create the first reusable Ruminate program, then publish its form."
            action={
              authorization.grants.has("program:create") ? (
                <ButtonLink href="/admin/programs/new" variant="secondary">
                  Create program
                </ButtonLink>
              ) : undefined
            }
          />
        )}
      </div>
    </>
  );
}
