import { auth } from "@/auth";
import { AuthGate } from "@/components/auth-gate";
import { PortalShell } from "@/components/portal-shell";
import { userAuthorizationOrNull } from "@/lib/authz";
import { hasDatabaseConfig } from "@/lib/env";
import type { Session } from "next-auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!hasDatabaseConfig())
    return (
      <AuthGate
        title="Admin setup required"
        body="Connect PostgreSQL and configure Google OAuth before opening the operational workspace."
      />
    );
  let session: Session | null;
  try {
    session = await auth();
  } catch (error) {
    console.error("[admin] authentication check failed", error);
    return (
      <AuthGate
        title="Admin temporarily unavailable"
        body="The live database or auth service could not be reached. Check the Vercel runtime logs and database connection."
      />
    );
  }
  if (!session?.user) return <AuthGate title="Admin sign in" />;
  let authorization: Awaited<ReturnType<typeof userAuthorizationOrNull>>;
  try {
    authorization = await userAuthorizationOrNull(session.user.id);
  } catch (error) {
    console.error("[admin] authorization lookup failed", error);
    return (
      <AuthGate
        title="Admin temporarily unavailable"
        body="The portal could not read admin permissions from the production database."
      />
    );
  }
  if (!authorization)
    return <AuthGate title="Your session has expired" body="Sign in again to continue to the admin workspace." />;
  if (!authorization.isSuperAdmin && !authorization.roles.has("PROGRAM_MANAGER"))
    return <AuthGate title="Admin access unavailable" body="Your account has not been assigned to manage a program." />;
  return (
    <PortalShell mode="admin" title="Admin workspace" user={session.user}>
      {children}
    </PortalShell>
  );
}
