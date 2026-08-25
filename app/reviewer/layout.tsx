import { auth } from "@/auth";
import { AuthGate } from "@/components/auth-gate";
import { PortalShell } from "@/components/portal-shell";
import { userAuthorizationOrNull } from "@/lib/authz";
import { hasDatabaseConfig } from "@/lib/env";
import type { Session } from "next-auth";

export const dynamic = "force-dynamic";
export default async function ReviewerLayout({ children }: { children: React.ReactNode }) {
  if (!hasDatabaseConfig()) return <AuthGate title="Reviewer setup required" />;
  let session: Session | null;
  try {
    session = await auth();
  } catch (error) {
    console.error("[reviewer] authentication check failed", error);
    return (
      <AuthGate
        title="Reviewer temporarily unavailable"
        body="The live database or auth service could not be reached. Check the Vercel runtime logs and database connection."
      />
    );
  }
  if (!session?.user) return <AuthGate title="Reviewer sign in" />;
  let authorization: Awaited<ReturnType<typeof userAuthorizationOrNull>>;
  try {
    authorization = await userAuthorizationOrNull(session.user.id);
  } catch (error) {
    console.error("[reviewer] authorization lookup failed", error);
    return (
      <AuthGate
        title="Reviewer temporarily unavailable"
        body="The portal could not read reviewer permissions from the production database."
      />
    );
  }
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
