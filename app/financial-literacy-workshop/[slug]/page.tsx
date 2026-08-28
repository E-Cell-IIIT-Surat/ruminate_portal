import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, MapPin, UsersRound } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { WorkshopBookingForm } from "@/components/workshop-booking-form";
import { Badge, ButtonLink, EmptyState } from "@/components/ui";
import { db } from "@/lib/db";
import { hasDatabaseConfig } from "@/lib/env";

export const dynamic = "force-dynamic";

type Workshop = Awaited<ReturnType<typeof getWorkshop>>;

async function getWorkshop(slug: string) {
  if (!hasDatabaseConfig()) return null;
  return db.workshop.findFirst({ where: { slug, archivedAt: null } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const workshop = await getWorkshop(slug);
    if (!workshop) return { title: "Workshop not found" };
    return {
      title: `${workshop.name} · Workshops`,
      description: workshop.summary,
    };
  } catch (error) {
    console.error("[workshop-detail] metadata lookup failed", error);
    return { title: "Workshop · Ruminate" };
  }
}

const formatDate = (value: Date | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(value)
    : "To be announced";

export default async function WorkshopDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let workshop: Workshop = null;
  try {
    workshop = await getWorkshop(slug);
  } catch (error) {
    console.error("[workshop-detail] read failed", error);
  }
  if (!workshop) notFound();

  const now = new Date();
  const registrationOpen =
    workshop.status === "PUBLISHED" &&
    (!workshop.registrationOpenAt || workshop.registrationOpenAt <= now) &&
    (!workshop.registrationCloseAt || workshop.registrationCloseAt >= now);
  const hasEnded = workshop.status === "COMPLETED" || (workshop.endsAt ? workshop.endsAt < now : false);

  return (
    <div className="public-page">
      <PublicHeader />
      <main className="public-container workshop-detail-page">
        <Link className="workshop-detail-back" href="/financial-literacy-workshop">
          <ArrowLeft size={16} /> Back to workshops &amp; events
        </Link>

        <section className="program-detail-hero workshop-detail-hero">
          <div className="workshop-card-top">
            <Badge tone={registrationOpen ? "green" : hasEnded ? "neutral" : "orange"}>
              {registrationOpen ? "Registration open" : hasEnded ? "Completed" : "Registration unavailable"}
            </Badge>
            {workshop.batch && <span>{workshop.batch}</span>}
          </div>
          <h1>{workshop.name}</h1>
          <p>{workshop.summary}</p>
          {workshop.bannerUrl && (
            <Image
              className="workshop-detail-banner"
              src={workshop.bannerUrl}
              alt={`${workshop.name} banner`}
              width={1200}
              height={420}
              unoptimized
              priority
            />
          )}
        </section>

        <div className="detail-layout workshop-detail-layout">
          <article className="rich-panel">
            <h2>About this event</h2>
            <p className="workshop-detail-description">{workshop.description}</p>

            {registrationOpen ? (
              <section className="workshop-booking-section">
                <div>
                  <p className="eyebrow">Reserve your place</p>
                  <h2>Join this session</h2>
                  <p>Share a few details and we will confirm your seat by email.</p>
                </div>
                <WorkshopBookingForm workshopId={workshop.slug} workshopName={workshop.name} />
              </section>
            ) : (
              <div className="workshop-closed-state">
                <EmptyState
                  icon={hasEnded ? CheckCircle2 : Clock3}
                  title={hasEnded ? "This event has ended" : "Registration is not open yet"}
                  body={
                    hasEnded
                      ? "Browse the catalogue for upcoming sessions and new opportunities from Ruminate."
                      : "The event details are available now. Registration will appear here when the admin opens it."
                  }
                  action={
                    <ButtonLink href="/financial-literacy-workshop" variant="secondary">
                      Browse all events
                    </ButtonLink>
                  }
                />
              </div>
            )}
          </article>

          <aside className="detail-sidebar workshop-detail-sidebar">
            <div>
              <CalendarDays />
              <span>Starts</span>
              <strong>{formatDate(workshop.startsAt)}</strong>
            </div>
            <div>
              <Clock3 />
              <span>Ends</span>
              <strong>{formatDate(workshop.endsAt)}</strong>
            </div>
            <div>
              <MapPin />
              <span>Venue</span>
              <strong>{workshop.venue ?? "To be announced"}</strong>
            </div>
            <div>
              <UsersRound />
              <span>Seats</span>
              <strong>{workshop.capacity ? `${workshop.capacity} seats` : "Open capacity"}</strong>
            </div>
            <div>
              <CheckCircle2 />
              <span>Registration closes</span>
              <strong>{formatDate(workshop.registrationCloseAt)}</strong>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
