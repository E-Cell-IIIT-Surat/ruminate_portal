import { PageHeader } from "@/components/ui";
import { ProgramSettings } from "@/components/program-settings";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProgramSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("program:update", id);
  const program = await db.program.findUniqueOrThrow({ where: { id } });
  return (
    <>
      <PageHeader
        eyebrow={program.name}
        title="Program settings"
        description="Lifecycle, access, capacity, team rules, results, and duplication."
      />
      <ProgramSettings
        program={{
          id: program.id,
          name: program.name,
          slug: program.slug,
          shortDescription: program.shortDescription,
          description: program.description,
          eligibility: program.eligibility,
          instructions: program.instructions,
          status: program.status,
          visibility: program.visibility,
          type: program.type,
          participationMode: program.participationMode,
          registrationOpenAt: program.registrationOpenAt?.toISOString().slice(0, 16) ?? null,
          registrationCloseAt: program.registrationCloseAt?.toISOString().slice(0, 16) ?? null,
          startAt: program.startAt?.toISOString().slice(0, 16) ?? null,
          endAt: program.endAt?.toISOString().slice(0, 16) ?? null,
          capacity: program.capacity,
          waitlistEnabled: program.waitlistEnabled,
          teamMinSize: program.teamMinSize,
          teamMaxSize: program.teamMaxSize,
          allowsEditAfterSubmit: program.allowsEditAfterSubmit,
          editDeadline: program.editDeadline?.toISOString().slice(0, 16) ?? null,
          requiresReview: program.requiresReview,
          allowsDrafts: program.allowsDrafts,
          requiresAuth: program.requiresAuth,
          allowsWithdrawal: program.allowsWithdrawal,
          blindReview: program.blindReview,
          allowedEmailDomains: program.allowedEmailDomains,
          resultsPublishedAt: program.resultsPublishedAt?.toISOString() ?? null,
        }}
      />
    </>
  );
}
