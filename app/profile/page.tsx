import { auth } from "@/auth";
import { AuthGate } from "@/components/auth-gate";
import { PortalShell } from "@/components/portal-shell";
import { ProfileForm } from "@/components/profile-form";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) return <AuthGate />;
  const profile = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
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
