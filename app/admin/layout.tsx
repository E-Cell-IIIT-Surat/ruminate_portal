import { auth } from "@/auth";
import { AuthGate } from "@/components/auth-gate";
import { PortalShell } from "@/components/portal-shell";
import { userAuthorization } from "@/lib/authz";
import { hasDatabaseConfig } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!hasDatabaseConfig())
    return (
      <AuthGate
        title="Admin setup required"
        body="Connect PostgreSQL and configure Google OAuth before opening the operational workspace."
      />
    );
  const session = await auth();
  if (!session?.user) return <AuthGate title="Admin sign in" />;
  const authorization = await userAuthorization(session.user.id);
  if (!authorization.isSuperAdmin && !authorization.roles.has("PROGRAM_MANAGER"))
    return <AuthGate title="Admin access unavailable" body="Your account has not been assigned to manage a program." />;
  return (
    <PortalShell mode="admin" title="Admin workspace" user={session.user}>
      {children}
    </PortalShell>
  );
}
