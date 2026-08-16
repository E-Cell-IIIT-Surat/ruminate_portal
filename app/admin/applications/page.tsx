import { auth } from "@/auth";
import { userAuthorization } from "@/lib/authz";
import { db } from "@/lib/db";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { ClipboardList, Search } from "lucide-react";

export const dynamic = "force-dynamic";
export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;
  const authorization = await userAuthorization(session.user.id);
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);
  const take = 25;
  const q = query.q?.trim() ?? "";
  const scope = authorization.isSuperAdmin ? {} : { id: { in: [...authorization.managedProgramIds] } };
  const where = {
    program: scope,
    archivedAt: null,
    ...(query.status ? { status: query.status as never } : {}),
    ...(q
      ? {
          OR: [
            { referenceId: { contains: q, mode: "insensitive" as const } },
            { user: { name: { contains: q, mode: "insensitive" as const } } },
            { user: { email: { contains: q, mode: "insensitive" as const } } },
            { team: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
  const [applications, total] = await Promise.all([
    db.application.findMany({
      where,
      select: {
        id: true,
        referenceId: true,
        status: true,
        submittedAt: true,
        user: { select: { name: true, email: true } },
        team: { select: { name: true } },
        program: { select: { name: true } },
        stage: { select: { name: true } },
        reviewerAssignments: { select: { status: true } },
        evaluations: { where: { status: "SUBMITTED" }, select: { totalScore: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    db.application.count({ where }),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Applications"
        title="Application operations"
        description={`${total} authorized records · server-side pagination`}
      />
      <form className="filter-bar">
        <label>
          <Search size={15} />
          <input name="q" defaultValue={q} placeholder="Reference, applicant, email, or team" />
        </label>
        <select name="status" defaultValue={query.status ?? ""}>
          <option value="">All statuses</option>
          {[
            "DRAFT",
            "SUBMITTED",
            "UNDER_REVIEW",
            "CHANGES_REQUESTED",
            "SHORTLISTED",
            "SELECTED",
            "REJECTED",
            "APPROVED",
            "WAITLISTED",
            "CONFIRMED",
            "WITHDRAWN",
          ].map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <button className="button button-secondary">Filter</button>
      </form>
      <div className="panel">
        {applications.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Application</th>
                  <th>Applicant / Team</th>
                  <th>Submitted</th>
                  <th>Stage</th>
                  <th>Reviewer progress</th>
                  <th>Average score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((item) => {
                  const complete = item.reviewerAssignments.filter(
                    (assignment) => assignment.status === "COMPLETED",
                  ).length;
                  const scores = item.evaluations
                    .map((evaluation) => evaluation.totalScore?.toNumber())
                    .filter((score): score is number => score !== undefined);
                  const average = scores.length
                    ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)
                    : "—";
                  return (
                    <tr key={item.id}>
                      <td>
                        <a href={`/admin/applications/${item.id}`}>
                          <strong>{item.referenceId}</strong>
                          <br />
                          <small>{item.program.name}</small>
                        </a>
                      </td>
                      <td>{item.team?.name ?? item.user.name ?? item.user.email}</td>
                      <td>{item.submittedAt?.toLocaleDateString("en-IN") ?? "Draft"}</td>
                      <td>{item.stage?.name ?? "—"}</td>
                      <td>
                        {complete}/{item.reviewerAssignments.length}
                      </td>
                      <td>{average}</td>
                      <td>
                        <Badge
                          tone={
                            item.status === "SELECTED" || item.status === "APPROVED"
                              ? "green"
                              : item.status === "REJECTED"
                                ? "red"
                                : "orange"
                          }
                        >
                          {item.status.replaceAll("_", " ")}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No matching applications"
            body="Adjust the filters or wait for participants to submit."
          />
        )}
      </div>
      {total > take && (
        <nav className="pagination" aria-label="Pagination">
          <a
            aria-disabled={page === 1}
            href={`?page=${page - 1}&q=${encodeURIComponent(q)}&status=${query.status ?? ""}`}
          >
            Previous
          </a>
          <span>
            Page {page} of {Math.ceil(total / take)}
          </span>
          <a
            aria-disabled={page * take >= total}
            href={`?page=${page + 1}&q=${encodeURIComponent(q)}&status=${query.status ?? ""}`}
          >
            Next
          </a>
        </nav>
      )}
    </>
  );
}
