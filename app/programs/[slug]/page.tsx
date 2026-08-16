import { CalendarDays, Clock3, UsersRound } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { Badge, ButtonLink, EmptyState } from "@/components/ui";
import { db } from "@/lib/db";
import { hasDatabaseConfig } from "@/lib/env";
import { registrationState } from "@/lib/domain/program";

export const dynamic = "force-dynamic";

export default async function ProgramPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const program = hasDatabaseConfig()
    ? await db.program.findUnique({
        where: { slug, archivedAt: null },
        select: {
          id: true,
          name: true,
          shortDescription: true,
          description: true,
          eligibility: true,
          instructions: true,
          status: true,
          registrationOpenAt: true,
          registrationCloseAt: true,
          startAt: true,
          endAt: true,
          capacity: true,
          participationMode: true,
          teamMinSize: true,
          teamMaxSize: true,
        },
      })
    : null;
  if (!program)
    return (
      <div className="public-page">
        <PublicHeader />
        <main className="public-container">
          <div className="panel">
            <EmptyState
              icon={Clock3}
              title="Program not found"
              body="This program may be unpublished, archived, or the link may be incorrect."
              action={
                <ButtonLink href="/programs" variant="secondary">
                  Browse programs
                </ButtonLink>
              }
            />
          </div>
        </main>
      </div>
    );
  const state = registrationState(program);
  const format = (value: Date | null) =>
    value
      ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(value)
      : "To be announced";
  return (
    <div className="public-page">
      <PublicHeader />
      <main className="public-container">
        <div className="program-detail-hero">
          <Badge tone={state === "OPEN" ? "green" : state === "UPCOMING" ? "blue" : "neutral"}>{state}</Badge>
          <h1>{program.name}</h1>
          <p>{program.shortDescription}</p>
          <div className="hero-actions">
            {state === "OPEN" ? (
              <ButtonLink href={`/applications/start?program=${program.id}`}>Apply now</ButtonLink>
            ) : (
              <ButtonLink href="/programs" variant="secondary">
                Explore other programs
              </ButtonLink>
            )}
          </div>
        </div>
        <div className="detail-layout">
          <article className="rich-panel">
            <h2>About this program</h2>
            <p>{program.description}</p>
            {program.eligibility && (
              <>
                <h2>Eligibility</h2>
                <p>{program.eligibility}</p>
              </>
            )}
            {program.instructions && (
              <>
                <h2>Important instructions</h2>
                <p>{program.instructions}</p>
              </>
            )}
          </article>
          <aside className="detail-sidebar">
            <div>
              <CalendarDays />
              <span>Program dates</span>
              <strong>{format(program.startAt)}</strong>
            </div>
            <div>
              <Clock3 />
              <span>Registration closes</span>
              <strong>{format(program.registrationCloseAt)}</strong>
            </div>
            <div>
              <UsersRound />
              <span>Participation</span>
              <strong>
                {program.participationMode === "TEAM"
                  ? `${program.teamMinSize}–${program.teamMaxSize} members`
                  : program.participationMode.toLowerCase()}
              </strong>
            </div>
            {program.capacity && (
              <div>
                <span>Capacity</span>
                <strong>{program.capacity} places</strong>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
