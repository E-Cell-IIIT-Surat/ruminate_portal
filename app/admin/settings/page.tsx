import { PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/authz";
import { CheckCircle2, ExternalLink, Settings2 } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export default async function AdminSettingsPage() {
  await requirePermission("user:manage");
  const checks = [
    ["PostgreSQL", Boolean(process.env.DATABASE_URL), "Stores users, forms, applications, reviews, and audit history."],
    [
      "Google OAuth",
      Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      "Secure sign-in and account linking for participants, reviewers, and admins.",
    ],
    [
      "Private R2 storage",
      Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY),
      "Stores uploaded documents privately; files are verified before they are attached to an application.",
    ],
    [
      "Email delivery",
      process.env.EMAIL_PROVIDER === "resend" ? Boolean(process.env.RESEND_API_KEY) : true,
      "Announcement and workflow emails are queued and processed by the email worker.",
    ],
  ] as const;
  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Production readiness"
        description="A safe operational checklist. Secret values are never displayed here."
      />
      <div className="settings-grid">
        {checks.map(([label, ready, description]) => (
          <article className="settings-card" key={label}>
            <div className="settings-card-top">
              <span className="settings-icon">
                <Settings2 size={18} />
              </span>
              <span className={ready ? "settings-status ready" : "settings-status"}>
                {ready ? <CheckCircle2 size={14} /> : "!"} {ready ? "Configured" : "Action required"}
              </span>
            </div>
            <h2>{label}</h2>
            <p>{description}</p>
          </article>
        ))}
      </div>
      <div className="settings-help panel">
        <div>
          <span className="eyebrow">What belongs here?</span>
          <h2>System readiness, not content management.</h2>
          <p>
            Use program workspaces for forms, stages, rubrics, reviewers, and announcements. Use this page to confirm
            that the infrastructure those workflows depend on is connected.
          </p>
        </div>
        <Link href="/admin/audit-logs">
          Review audit activity <ExternalLink size={15} />
        </Link>
      </div>
    </>
  );
}
