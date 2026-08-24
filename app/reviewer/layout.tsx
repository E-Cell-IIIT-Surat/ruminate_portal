import { auth } from "@/auth";
import { AuthGate } from "@/components/auth-gate";
import { PortalShell } from "@/components/portal-shell";
import { userAuthorizationOrNull } from "@/lib/authz";
import { hasDatabaseConfig } from "@/lib/env";

export const dynamic = "force-dynamic";
export default async function ReviewerLayout({ children }: { children: React.ReactNode }) {
  if (!hasDatabaseConfig()) return <AuthGate title="Reviewer setup required" />;
  const session = await auth();
  if (!session?.user) return <AuthGate title="Reviewer sign in" />;
  const authorization = await userAuthorizationOrNull(session.user.id);
  if (!authorization)
    return <AuthGate title="Your session has expired" body="Sign in again to continue to the reviewer workspace." />;
  if (
    !authorization.roles.has("REVIEWER") &&
    !authorization.roles.has("FACULTY_REVIEWER") &&
    !authorization.isSuperAdmin
  )
    return (
      <AuthGate
        title="Reviewer access unavailable"
        body="Reviews appear only after a program manager assigns them to you."
      />
    );
  return (
    <PortalShell mode="reviewer" title="Reviewer workspace" user={session.user}>
      {children}
    </PortalShell>
  );
}
