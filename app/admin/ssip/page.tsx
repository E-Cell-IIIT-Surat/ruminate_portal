import { Download } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { AdminSSIPConsole } from "@/components/admin-ssip-console";
import { Metric, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";

type SSIPSubmissionRow = Prisma.SSIPSubmissionGetPayload<{
  select: {
    id: true;
    referenceId: true;
    name: true;
    email: true;
    title: true;
    status: true;
    estimatedBudget: true;
    createdAt: true;
  };
}>;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminSSIPPage() {
  await requirePermission("program:update");

  let settings: Awaited<ReturnType<typeof db.sSIPSettings.findUnique>> = null;
  let submissions: SSIPSubmissionRow[] = [];
  let databaseReady = true;

  try {
    [settings, submissions] = await Promise.all([
      db.sSIPSettings.findUnique({ where: { id: "default" } }),
      db.sSIPSubmission.findMany({
        orderBy: { createdAt: "desc" },
        take: 500,
        select: {
          id: true,
          referenceId: true,
          name: true,
          email: true,
          title: true,
          status: true,
          estimatedBudget: true,
          createdAt: true,
        },
      }),
    ]);
  } catch (error) {
    databaseReady = false;
    console.error("[admin/ssip] database read failed", error);
  }

  const counts = submissions.reduce(
    (acc, submission) => {
      acc.total += 1;
      if (submission.status === "ACCEPTED") acc.accepted += 1;
      if (submission.status === "REJECTED") acc.rejected += 1;
      if (submission.status === "UNDER_REVIEW") acc.review += 1;
      return acc;
    },
    { total: 0, accepted: 0, rejected: 0, review: 0 },
  );

  return (
    <>
      <PageHeader
        eyebrow="SSIP operations"
        title="Student innovation pipeline"
        description="Control the submission window, review incoming proposals, and export the complete SSIP register."
        action={
          <a className="button button-secondary" href="/api/admin/ssip/export">
            <Download size={16} /> Export CSV
          </a>
        }
      />
      {!databaseReady && (
        <div className="panel ssip-window-notice" role="alert">
          <strong>SSIP data is temporarily unavailable.</strong>
          <span>
            Apply the latest Prisma migrations and refresh this page. The underlying error is logged server-side.
          </span>
        </div>
      )}
      <div className="metric-grid">
        <Metric label="Submissions" value={counts.total} />
        <Metric label="Under review" value={counts.review} />
        <Metric label="Accepted" value={counts.accepted} />
        <Metric label="Rejected" value={counts.rejected} />
      </div>
      <AdminSSIPConsole
        initialSettings={{
          isOpen: settings?.isOpen ?? false,
          opensAt: settings?.opensAt?.toISOString() ?? null,
          closesAt: settings?.closesAt?.toISOString() ?? null,
        }}
        initialSubmissions={submissions.map((submission) => ({
          id: submission.id,
          referenceId: submission.referenceId,
          name: submission.name,
          email: submission.email,
          title: submission.title,
          status: submission.status,
          estimatedBudget: submission.estimatedBudget?.toString() ?? null,
          createdAt: submission.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
