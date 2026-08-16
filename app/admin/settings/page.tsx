import { PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/authz";

export const dynamic = "force-dynamic";
export default async function AdminSettingsPage() {
  await requirePermission("user:manage");
  const checks = [
    ["PostgreSQL", Boolean(process.env.DATABASE_URL)],
    ["Google OAuth", Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)],
    [
      "Private R2 storage",
      Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY),
    ],
    ["Email delivery", process.env.EMAIL_PROVIDER === "resend" ? Boolean(process.env.RESEND_API_KEY) : true],
  ] as const;
  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Production readiness"
        description="Configuration status only; secret values are never displayed."
      />
      <div className="panel compact-list">
        {checks.map(([label, ready]) => (
          <div key={label}>
            <strong>{label}</strong>
            <small>{ready ? "Configured" : "Configuration required"}</small>
          </div>
        ))}
      </div>
    </>
  );
}
