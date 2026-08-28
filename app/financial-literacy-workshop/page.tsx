import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, CalendarDays, CheckCircle2, Clock3, Layers3, UsersRound } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { Badge, EmptyState } from "@/components/ui";
import { db } from "@/lib/db";
import { hasDatabaseConfig } from "@/lib/env";
import { registrationState } from "@/lib/domain/program";

export const metadata: Metadata = {
  title: "Workshops & events",
  description: "Explore Ruminate workshops, competitions, hackathons, and learning events.",
};
export const dynamic = "force-dynamic";

const programmeTypes = [
  "EVENT",
  "WORKSHOP",
  "HACKATHON",
  "STARTUP_COMPETITION",
  "PITCH_EVENT",
  "INDUSTRY_VISIT",
  "MENTORSHIP",
  "SSIP",
] as const;

function workshopsQuery() {
  return db.workshop.findMany({
    where: { archivedAt: null },
    orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
    take: 30,
  });
}

function programmesQuery() {
  return db.program.findMany({
    where: {
      archivedAt: null,
      visibility: "PUBLIC",
      type: { in: [...programmeTypes] },
      status: { notIn: ["DRAFT", "ARCHIVED"] },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      shortDescription: true,
      status: true,
      registrationOpenAt: true,
      registrationCloseAt: true,
      startAt: true,
      createdAt: true,
    },
    orderBy: [{ startAt: "asc" }, { createdAt: "desc" }],
    take: 30,
  });
}

const formatDate = (value: Date | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(value)
    : "Date to be announced";

export default async function FinancialLiteracyWorkshopPage() {
  let workshops: Awaited<ReturnType<typeof workshopsQuery>> = [];
  let programmes: Awaited<ReturnType<typeof programmesQuery>> = [];

  if (hasDatabaseConfig()) {
    try {
      [workshops, programmes] = await Promise.all([workshopsQuery(), programmesQuery()]);
    } catch (error) {
      console.error("[workshops] catalogue read failed", error);
    }
  }

  const upcoming = workshops.filter((workshop) => workshop.status === "PUBLISHED");
  const previous = workshops.filter((workshop) => workshop.status === "COMPLETED");
  const programmeCards = programmes.filter((programme) => !["COMPLETED", "ARCHIVED"].includes(programme.status));
  const previousProgrammes = programmes.filter((programme) => programme.status === "COMPLETED");

  return (
    <div className="public-page">
      <PublicHeader />
      <main className="public-container">
        <section className="program-detail-hero workshop-directory-hero">
          <span className="kicker">
            <BookOpenCheck size={15} /> Ruminate learning series
          </span>
          <h1>Workshops, competitions &amp; events</h1>
          <p>
            Learn by doing. Browse upcoming sessions, innovation challenges, hackathons, and the workshops that help
            Ruminate students turn curiosity into momentum.
          </p>
          <div className="workshop-hero-banner">
            <div className="workshop-hero-mark">
              <BookOpenCheck size={28} />
            </div>
            <div>
              <strong>Choose an experience, then reserve your place.</strong>
              <span>Open an event card to read its details and access its registration form.</span>
            </div>
            <a className="button button-secondary" href="#upcoming">
              Browse events <ArrowRight size={16} />
            </a>
          </div>
        </section>

        <div className="detail-layout">
          <article className="rich-panel">
            <h2>What you will find here</h2>
            <p>
              From financial literacy and founder sessions to UdbhAV-style idea challenges, every listing has a clear
              overview, dates, eligibility, and a single place to register. Forms stay hidden until you choose the
              specific event, so the catalogue remains easy to scan on desktop and mobile.
            </p>

            <h2 id="upcoming">Upcoming workshops</h2>
            {upcoming.length ? (
              <div className="workshop-catalogue">
                {upcoming.map((workshop) => (
                  <Link className="workshop-card" href={`/financial-literacy-workshop/${workshop.slug}`} key={workshop.id}>
                    {workshop.bannerUrl && (
                      <Image
                        className="workshop-card-banner"
                        src={workshop.bannerUrl}
                        alt={`${workshop.name} banner`}
                        width={720}
                        height={150}
                        unoptimized
                      />
                    )}
                    <div className="workshop-card-top">
                      <Badge tone="green">Registration open</Badge>
                      <span>{workshop.batch ?? "All batches"}</span>
                    </div>
                    <h3>{workshop.name}</h3>
                    <p>{workshop.summary}</p>
                    <small>
                      {formatDate(workshop.startsAt)} · {workshop.venue ?? "Venue to be announced"}
                    </small>
                    <span className="workshop-card-link">View details &amp; reserve a seat <ArrowRight size={15} /></span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="No workshops are open right now"
                body="New sessions will appear here as soon as an admin publishes them. Check back soon."
              />
            )}

            <h2>Programmes, competitions &amp; hackathons</h2>
            {programmeCards.length ? (
              <div className="workshop-catalogue">
                {programmeCards.map((programme) => {
                  const state = registrationState(programme);
                  return (
                    <Link className="workshop-card" href={`/programs/${programme.slug}`} key={programme.id}>
                      <div className="workshop-card-top">
                        <Badge tone={state === "OPEN" ? "green" : state === "UPCOMING" ? "blue" : "neutral"}>
                          {state}
                        </Badge>
                        <span>{programme.type.replaceAll("_", " ")}</span>
                      </div>
                      <h3>{programme.name}</h3>
                      <p>{programme.shortDescription}</p>
                      <small>{formatDate(programme.startAt)}</small>
                      <span className="workshop-card-link">View programme <ArrowRight size={15} /></span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="muted-copy">Published competitions and hackathons will appear here.</p>
            )}

            <h2>Previous workshops &amp; events</h2>
            {previous.length || previousProgrammes.length ? (
              <div className="workshop-history-list">
                {previous.map((workshop) => (
                  <Link href={`/financial-literacy-workshop/${workshop.slug}`} key={workshop.id}>
                    <strong>{workshop.name}</strong>
                    <span>{formatDate(workshop.startsAt)} · {workshop.venue ?? "Ruminate"}</span>
                    <p>{workshop.description}</p>
                  </Link>
                ))}
                {previousProgrammes.map((programme) => (
                  <Link href={`/programs/${programme.slug}`} key={programme.id}>
                    <strong>{programme.name}</strong>
                    <span>{programme.type.replaceAll("_", " ")} · Past event</span>
                    <p>{programme.shortDescription}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="muted-copy">Previous sessions will be listed here after an admin marks them completed.</p>
            )}
          </article>

          <aside className="detail-sidebar">
            <div>
              <Layers3 />
              <span>Formats</span>
              <strong>Workshops, challenges &amp; events</strong>
            </div>
            <div>
              <Clock3 />
              <span>Typical duration</span>
              <strong>60–180 minutes</strong>
            </div>
            <div>
              <UsersRound />
              <span>Audience</span>
              <strong>IIIT Surat students</strong>
            </div>
            <div>
              <CheckCircle2 />
              <span>Registration</span>
              <strong>Confirmation by email</strong>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
