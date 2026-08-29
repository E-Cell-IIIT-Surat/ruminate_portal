import type { Metadata } from "next";
import { ArrowRight, CalendarDays, ChartNoAxesCombined, Lightbulb, Rocket, UsersRound } from "lucide-react";
import { auth } from "@/auth";
import { PublicHeader } from "@/components/public-header";
import { UdbhavSubmissionForm } from "@/components/udbhav-submission-form";
import { Badge, ButtonLink } from "@/components/ui";
import { db } from "@/lib/db";
import { hasDatabaseConfig } from "@/lib/env";
import { defaultUdbhavWindow } from "@/lib/udbhav";
import type { Session } from "next-auth";

export const metadata: Metadata = { title: "UdbhAV" };
export const dynamic = "force-dynamic";

function activeCycleQuery() {
  return db.udbhavCycle.findFirst({
    where: {
      status: { not: "CLOSED" },
      OR: [{ status: "OPEN" }, { closesAt: { gte: new Date() } }],
    },
    orderBy: { opensAt: "asc" },
  });
}

function ownSubmissionsQuery(userId: string) {
  return db.udbhavSubmission.findMany({
    where: { leaderId: userId },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: { id: true, referenceId: true, title: true, status: true, currentStage: true, totalScore: true },
  });
}

export default async function UdbhavPage() {
  const hasDb = hasDatabaseConfig();
  let session: Session | null = null;
  let cycle: Awaited<ReturnType<typeof activeCycleQuery>> = null;
  let ownSubmissions: Awaited<ReturnType<typeof ownSubmissionsQuery>> = [];
  const window = defaultUdbhavWindow();

  if (hasDb) {
    try {
      session = await auth();
      cycle = await activeCycleQuery();
    } catch (error) {
      console.error("[udbhav] database read failed", error);
    }
  }

  const now = new Date();
  const opensAt = cycle?.opensAt ?? window.opensAt;
  const closesAt = cycle?.closesAt ?? window.closesAt;
  const isOpen = cycle?.status === "OPEN" || (cycle?.status !== "CLOSED" && now >= opensAt && now <= closesAt);

  if (session?.user) {
    try {
      ownSubmissions = await ownSubmissionsQuery(session.user.id);
    } catch (error) {
      console.error("[udbhav] user submissions read failed", error);
    }
  }

  return (
    <div className="public-page udbhav-page">
      <PublicHeader />
      <main className="public-container">
        <section className="udbhav-hero">
          <Badge tone="orange">Ruminate presents</Badge>
          <p className="udbhav-wordmark">UDHBHAV</p>
          <p className="udbhav-tagline">
            Ideate <span>·</span> Innovate <span>·</span> Elevate
          </p>
          <p className="udbhav-quote">
            उद्यमेन हि सिध्यन्ति कार्याणि न मनोरथैः।
            <br />
            <em>By effort, things are accomplished, not by mere wishes.</em>
          </p>
          <div className="udbhav-definition">
            <Lightbulb size={34} />
            <div>
              <strong>What is UdbhAV?</strong>
              <p>
                UdbhAV means rise, progress, upliftment. It is our commitment to uplift ideas, empower innovators, and
                build a better tomorrow.
              </p>
            </div>
          </div>
          <div className="udbhav-journey">
            <div>
              <Lightbulb />
              <strong>Submit your idea</strong>
              <span>Bring your vision to the table.</span>
            </div>
            <div>
              <UsersRound />
              <strong>Get mentorship</strong>
              <span>Learn, refine and grow with experts.</span>
            </div>
            <div>
              <ChartNoAxesCombined />
              <strong>Get funded</strong>
              <span>From direct funding to SSIP support.</span>
            </div>
          </div>
          <div className="udbhav-window">
            <CalendarDays />
            <div>
              <small>Monthly release window</small>
              <strong>1st–3rd of every month</strong>
            </div>
            <span>{isOpen ? "Open now" : `Next window: ${opensAt.toLocaleDateString("en-IN")}`}</span>
          </div>
          <p className="udbhav-impact">
            Your idea today. Tomorrow&apos;s impact.
            <br />
            <strong>Be the change.</strong>
          </p>
        </section>
        <section className="udbhav-detail-layout">
          <aside className="udbhav-info-row">
            <div className="udbhav-info-card">
              <CalendarDays size={20} />
              <span>Submission window</span>
              <strong>1st–3rd monthly</strong>
            </div>
            <div className="udbhav-info-card">
              <Rocket size={20} />
              <span>Journey</span>
              <strong>Idea → mentorship → funding</strong>
            </div>
            <div className="udbhav-info-card">
              <UsersRound size={20} />
              <span>Format</span>
              <strong>Student teams</strong>
            </div>
          </aside>
          <article className="rich-panel udbhav-form-panel">
            <h2>
              <Lightbulb size={20} /> Innovation proposal
            </h2>
            <p>
              Tell us about the challenge, your solution, the technology behind it, estimated costs, distribution plan,
              and the milestones that will turn the idea into impact.
            </p>
            {!session?.user ? (
              <ButtonLink href="/signin">
                Sign in to submit <ArrowRight size={16} />
              </ButtonLink>
            ) : isOpen ? (
              <UdbhavSubmissionForm cycleId={cycle?.id} />
            ) : (
              <div className="cycle-closed">
                <Rocket size={22} />
                <strong>Submissions are closed right now</strong>
                <p>
                  The UdbhAV form opens on the first three days of every month. Your progress will be saved in the
                  portal when the next window opens.
                </p>
              </div>
            )}
          </article>
        </section>
        {ownSubmissions.length > 0 && (
          <section className="panel udbhav-your-ideas">
            <div className="panel-header">
              <h2>Your ideas</h2>
              <ButtonLink href="/dashboard" variant="secondary">
                Open portal
              </ButtonLink>
            </div>
            <div className="compact-list">
              {ownSubmissions.map((item) => (
                <a href={`/udbhav/submissions/${item.id}`} key={item.id}>
                  <strong>{item.title}</strong>
                  <small>
                    {item.referenceId} · {item.status.replaceAll("_", " ")} · {item.currentStage} ·{" "}
                    {item.totalScore?.toString() ?? "Score pending"}
                  </small>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}