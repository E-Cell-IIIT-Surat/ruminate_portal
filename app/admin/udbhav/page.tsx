import { Download, FileText, Lightbulb } from "lucide-react";
import { requireUdbhavAdmin } from "@/lib/udbhav";
import { db } from "@/lib/db";
import { EmptyState, PageHeader } from "@/components/ui";
import { UdbhavCycleControl, UdbhavStatusControl } from "@/components/udbhav-admin-controls";
import { ButtonLink } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminUdbhavPage() {
  await requireUdbhavAdmin();
  const now = new Date();
  const current = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  const [cycle, submissions] = await Promise.all([
    db.udbhavCycle.findUnique({ where: { year_month: current } }),
    db.udbhavSubmission.findMany({
      include: {
        leader: { select: { name: true, email: true } },
        cycle: true,
        reviews: { select: { totalScore: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 500,
    }),
  ]);
  const fallback = {
    month: current.month,
    year: current.year,
    opensAt: new Date(Date.UTC(current.year, current.month - 1, 1)),
    closesAt: new Date(Date.UTC(current.year, current.month - 1, 3, 23, 59)),
    status: "SCHEDULED",
  };
  return (
    <>
      <PageHeader
        eyebrow="UdbhAV control room"
        title="Ideas, status, and evaluation"
        description="Professor and super-admin access for monthly windows, live statuses, private team messages, scoring, and exports."
        action={
          <a className="button button-secondary" href="/api/admin/udbhav/export">
            <Download size={16} /> Export Excel CSV
          </a>
        }
      />
      <UdbhavCycleControl initial={cycle ?? fallback} />
      <div className="metric-grid">
        <article className="metric-card">
          <span>Total ideas</span>
          <strong>{submissions.length}</strong>
        </article>
        <article className="metric-card">
          <span>Under review</span>
          <strong>{submissions.filter((item) => ["SUBMITTED", "UNDER_REVIEW"].includes(item.status)).length}</strong>
        </article>
        <article className="metric-card">
          <span>Accepted</span>
          <strong>{submissions.filter((item) => item.status === "ACCEPTED").length}</strong>
        </article>
        <article className="metric-card">
          <span>Scored</span>
          <strong>{submissions.filter((item) => item.totalScore !== null).length}</strong>
        </article>
      </div>
      <div className="panel">
        <div className="panel-header">
          <h2>Submitted ideas</h2>
          <span>{submissions.length} records</span>
        </div>
        {submissions.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Idea</th>
                  <th>Leader</th>
                  <th>Score</th>
                  <th>Stage / status</th>
                  <th>Open</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.title}</strong>
                      <br />
                      <small>
                        {item.referenceId} · {item.teamName}
                      </small>
                    </td>
                    <td>
                      {item.leader.name ?? item.leader.email}
                      <br />
                      <small>{item.leader.email}</small>
                    </td>
                    <td>
                      {item.totalScore?.toString() ?? "Pending"}
                      <br />
                      <small>{item.reviews.length} review(s)</small>
                    </td>
                    <td>
                      <UdbhavStatusControl id={item.id} initial={item.status} stage={item.currentStage} />
                    </td>
                    <td>
                      <ButtonLink href={`/admin/udbhav/${item.id}`} variant="secondary">
                        Review
                      </ButtonLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Lightbulb}
            title="No UdbhAV ideas yet"
            body="Ideas submitted during an open cycle will appear here."
          />
        )}
      </div>
      <div className="panel settings-help">
        <FileText size={20} />
        <div>
          <h2>How access works</h2>
          <p>
            The configured Nishad Deshpande email is granted super-admin access on sign-in. Other reviewers are managed
            from Users &amp; Roles and can score ideas through the reviewer workspace.
          </p>
        </div>
      </div>
    </>
  );
}
