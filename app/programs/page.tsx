import type { Metadata } from "next";
import { CalendarDays, Layers3 } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { publicPrograms } from "@/lib/data/public";
import { hasDatabaseConfig } from "@/lib/env";
import { registrationState } from "@/lib/domain/program";
import Link from "next/link";

export const metadata: Metadata = { title: "Programs" };
export const dynamic = "force-dynamic";

function date(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(value)
    : "To be announced";
}

export default async function ProgramsPage() {
  const programs = await publicPrograms();
  return (
    <div className="public-page">
      <PublicHeader />
      <main className="public-container">
        <PageHeader
          eyebrow="Discover"
          title="Programs at Ruminate"
          description="Explore open registrations, upcoming opportunities, and initiatives across entrepreneurship, innovation, and industry."
        />
        {!hasDatabaseConfig() && (
          <div className="setup-note">
            The portal is ready for its PostgreSQL connection. Programs will appear here as soon as the environment is
            configured.
          </div>
        )}
        {programs.length === 0 ? (
          <div className="panel">
            <EmptyState
              icon={Layers3}
              title="No published programs yet"
              body="There are no registrations to show right now. Check back for the next Ruminate initiative."
            />
          </div>
        ) : (
          <div className="program-grid">
            {programs.map((program) => {
              const state = registrationState(program);
              return (
                <Link className="program-card" href={`/programs/${program.slug}`} key={program.id}>
                  <Badge tone={state === "OPEN" ? "green" : state === "UPCOMING" ? "blue" : "neutral"}>{state}</Badge>
                  <h2>{program.name}</h2>
                  <p>{program.shortDescription}</p>
                  <div className="program-meta">
                    <span>
                      <CalendarDays size={13} /> {date(program.startAt)}
                    </span>
                    <span>{program.participationMode.toLowerCase()}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
