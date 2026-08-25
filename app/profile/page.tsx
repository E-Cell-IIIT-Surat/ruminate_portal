import { auth } from "@/auth";
import { AuthGate } from "@/components/auth-gate";
import { PortalShell } from "@/components/portal-shell";
import { ProfileForm } from "@/components/profile-form";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { hasDatabaseConfig } from "@/lib/env";
import type { Session } from "next-auth";

export const dynamic = "force-dynamic";

function profileQuery(userId: string) {
  return db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      phone: true,
      institution: true,
      degree: true,
      studyYear: true,
      city: true,
      studentId: true,
    },
  });
}

export default async function ProfilePage() {
  if (!hasDatabaseConfig()) return <AuthGate title="Portal setup required" />;
  let session: Session | null;
  try {
    session = await auth();
  } catch (error) {
    console.error("[profile] authentication check failed", error);
    return <AuthGate title="Profile temporarily unavailable" body="The live auth service could not be reached." />;
  }
  if (!session?.user) return <AuthGate />;
  let profile: Awaited<ReturnType<typeof profileQuery>>;
  try {
    profile = await profileQuery(session.user.id);
  } catch (error) {
    console.error("[profile] database read failed", error);
    return (
      <AuthGate
        title="Profile temporarily unavailable"
        body="The portal could not read your profile from the production database."
      />
    );
  }
  return (
    <PortalShell mode="participant" title="Participant portal" user={session.user}>
      <PageHeader
        eyebrow="Account"
        title="My profile"
        description="Keep reusable participant details current. Individual programs may ask for additional information."
      />
      <ProfileForm profile={profile} />
    </PortalShell>
  );
}
