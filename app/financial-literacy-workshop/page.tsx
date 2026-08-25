import type { Metadata } from "next";
import Image from "next/image";
import { BookOpenCheck, CalendarDays, CheckCircle2, Clock3, UsersRound } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { WorkshopBookingForm } from "@/components/workshop-booking-form";
import { Badge, ButtonLink } from "@/components/ui";
import { db } from "@/lib/db";
import { hasDatabaseConfig } from "@/lib/env";

export const metadata: Metadata = { title: "Financial Literacy Workshop" };
export const dynamic = "force-dynamic";

export default async function FinancialLiteracyWorkshopPage() {
  const workshops = hasDatabaseConfig()
    ? await db.workshop.findMany({
        where: { archivedAt: null },
        orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
        take: 30,
      })
    : [];
  const upcoming = workshops.filter((workshop) => workshop.status === "PUBLISHED");
  const previous = workshops.filter((workshop) => workshop.status === "COMPLETED");
  return (
    <div className="public-page">
      <PublicHeader />
      <main className="public-container">
        <section className="program-detail-hero">
          <span className="kicker">
            <BookOpenCheck size={15} /> Ruminate learning series
          </span>
          <h1>Financial Literacy Workshop</h1>
          <p>
            A practical session for students to build confidence with budgeting, saving, responsible credit, investing
            basics, and everyday money decisions.
          </p>
          <div className="workshop-hero-banner">
            <div className="workshop-hero-mark">
              <BookOpenCheck size={28} />
            </div>
            <div>
              <strong>Financial literacy, made practical.</strong>
              <span>Explore a session, choose your batch, and reserve your seat in a few minutes.</span>
            </div>
            <ButtonLink href={upcoming[0] ? `#booking-${upcoming[0].id}` : "#booking"} variant="secondary">
              View booking form
            </ButtonLink>
          </div>
        </section>
        <div className="detail-layout">
          <article className="rich-panel">
            <h2>What you will learn</h2>
            <p>
              Understand how to plan a monthly budget, read a bank statement, avoid common financial traps, and make
              informed choices about savings and long-term goals. The session is designed for beginners and uses
              examples relevant to student life.
            </p>
            <h2>Upcoming workshops</h2>
            {upcoming.length ? (
              <div className="workshop-catalogue">
                {upcoming.map((workshop) => (
                  <article className="workshop-card" key={workshop.id}>
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
                      {workshop.startsAt?.toLocaleString("en-IN") ?? "Date to be announced"} ·{" "}
                      {workshop.venue ?? "Venue to be announced"}
                    </small>
                    <ButtonLink href={`#booking-${workshop.id}`}>Reserve a seat</ButtonLink>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted-copy">No upcoming workshops are open right now. Check back soon.</p>
            )}
            {upcoming.map((workshop) => (
              <section className="workshop-booking-section" id={`booking-${workshop.id}`} key={workshop.id}>
                <h3>Reserve a seat: {workshop.name}</h3>
                <WorkshopBookingForm workshopId={workshop.slug} workshopName={workshop.name} />
              </section>
            ))}
            {!workshops.length && (
              <>
                <h2 id="booking">Reserve a seat</h2>
                <p>Share your student details below. The workshop team will confirm the venue and timing by email.</p>
                <WorkshopBookingForm workshopName="Financial Literacy Workshop" />
              </>
            )}
            <h2>Previous workshops</h2>
            {previous.length ? (
              <div className="workshop-history-list">
                {previous.map((workshop) => (
                  <div key={workshop.id}>
                    <strong>{workshop.name}</strong>
                    <span>
                      {workshop.startsAt?.toLocaleDateString("en-IN") ?? workshop.year ?? "Past session"} ·{" "}
                      {workshop.venue ?? "Ruminate"}
                    </span>
                    <p>{workshop.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted-copy">
                Previous sessions will be listed here after they are marked completed by an admin.
              </p>
            )}
          </article>
          <aside className="detail-sidebar">
            <div>
              <CalendarDays />
              <span>Date</span>
              <strong>To be announced</strong>
            </div>
            <div>
              <Clock3 />
              <span>Duration</span>
              <strong>90 minutes</strong>
            </div>
            <div>
              <UsersRound />
              <span>Audience</span>
              <strong>IIIT Surat students</strong>
            </div>
            <div>
              <CheckCircle2 />
              <span>Seats</span>
              <strong>Confirmation by email</strong>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
