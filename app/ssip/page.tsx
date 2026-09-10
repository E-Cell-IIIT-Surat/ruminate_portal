import type { Metadata } from "next";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Lightbulb,
  Rocket,
  UsersRound,
} from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { Badge, ButtonLink } from "@/components/ui";
import { db } from "@/lib/db";
import { hasDatabaseConfig } from "@/lib/env";

export const metadata: Metadata = { title: "SSIP · Student Startup & Innovation Policy" };
export const dynamic = "force-dynamic";

function ssipSettingsQuery() {
  return db.sSIPSettings.findUnique({ where: { id: "default" } });
}

function isSubmissionWindowOpen(settings: Awaited<ReturnType<typeof ssipSettingsQuery>>) {
  if (!settings?.isOpen) return false;
  const now = Date.now();
  if (settings.opensAt && now < settings.opensAt.getTime()) return false;
  if (settings.closesAt && now > settings.closesAt.getTime()) return false;
  return true;
}

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : null;
}

export default async function SsipPage() {
  let settings: Awaited<ReturnType<typeof ssipSettingsQuery>> = null;

  if (hasDatabaseConfig()) {
    try {
      settings = await ssipSettingsQuery();
    } catch (error) {
      console.error("[ssip] database read failed", error);
    }
  }

  const submissionOpen = isSubmissionWindowOpen(settings);
  const formHref = submissionOpen ? "/ssip/apply" : "#ssip-status";
  const closeDate = formatDate(settings?.closesAt);
  const openDate = formatDate(settings?.opensAt);
  return (
    <div className="public-page ssip-page">
      <PublicHeader />
      <main className="public-container">
        <section className="program-detail-hero ssip-hero">
          <div>
            <Badge tone="blue">Student innovation · IIIT Surat</Badge>
            <h1>Student Startup &amp; Innovation Policy</h1>
            <p>
              SSIP gives student ideas a practical path from an early problem statement to a tested prototype, a
              thoughtful pitch, and responsible impact.
            </p>
            <div className="hero-actions">
              <ButtonLink href={formHref}>
                {submissionOpen ? "Submit your SSIP idea" : "View application status"} <ArrowRight size={17} />
              </ButtonLink>
              
                <a className="button button-secondary"
                href="https://ecelliiitsurat.in/ssip"
                target="_blank"
                rel="noreferrer"
              >
                Learn more about SSIP <ExternalLink size={15} />
              </a>
            </div>
          </div>
          <div className="ssip-hero-stat">
            <Rocket size={30} />
            <strong>Idea → prototype → impact</strong>
            <span>A review-ready path for student founders and problem solvers.</span>
          </div>
        </section>

        <section className="ssip-facts" aria-label="SSIP highlights">
          <article>
            <span>01</span>
            <strong>Seed support</strong>
            <p>Explore institute seed funding and SSIP support for promising student-led ideas.</p>
          </article>
          <article>
            <span>02</span>
            <strong>Mentorship</strong>
            <p>Get structured feedback from faculty, reviewers, and mentors who help sharpen the next step.</p>
          </article>
          <article>
            <span>03</span>
            <strong>Incubation &amp; acceleration</strong>
            <p>Move from a proposal to validation, collaboration, and a more confident pitch.</p>
          </article>
        </section>

        <div className="detail-layout">
          <article className="rich-panel ssip-content">
            <h2>What SSIP is designed to unlock</h2>
            <p>
              The Government of Gujarat launched the Student Startup and Innovation Policy in January 2022. IIIT Surat
              describes its SSIP ecosystem as a combination of funding assistance, mentorship, incubation, and
              accelerator support for student startups.
            </p>
            <div className="ssip-path">
              <div>
                <Lightbulb />
                <strong>Discover a problem</strong>
                <span>Start with a real need and the people affected by it.</span>
              </div>
              <div>
                <BookOpen />
                <strong>Shape the proposal</strong>
                <span>Explain the solution, technology, budget, and expected impact.</span>
              </div>
              <div>
                <UsersRound />
                <strong>Build with feedback</strong>
                <span>Work with a team, mentors, and reviewers through clear milestones.</span>
              </div>
              <div>
                <CheckCircle2 />
                <strong>Present the outcome</strong>
                <span>Track decisions, revisions, funding steps, and next actions in one place.</span>
              </div>
            </div>
          </article>
          <aside className="detail-sidebar ssip-sidebar">
            <div>
              <GraduationCap />
              <span>For</span>
              <strong>IIIT Surat students &amp; teams</strong>
            </div>
            <div>
              <Rocket />
              <span>Support</span>
              <strong>Funding, mentorship, incubation</strong>
            </div>
            <div>
              <CheckCircle2 />
              <span>Workflow</span>
              <strong>Structured review and milestones</strong>
            </div>
          </aside>
        </div>

        <section className="panel ssip-application-panel" id="ssip-status" aria-labelledby="ssip-apply-title">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Submit your idea</p>
              <h2 id="ssip-apply-title">SSIP application window</h2>
            </div>
            <Badge tone={submissionOpen ? "green" : "orange"}>{submissionOpen ? "OPEN" : "CLOSED"}</Badge>
          </div>
          <div className="ssip-window-notice">
            <CalendarClock size={22} />
            <div>
              <h3>{submissionOpen ? "Applications are open" : "Applications are not open right now"}</h3>
              <p>
                {submissionOpen
                  ? "Sign in to submit your proposal. After submission, track the reference, status, and review updates from your portal."
                  : openDate
                    ? `The next window opens ${openDate}. `
                    : "The next application window will be announced soon. "}
                {!submissionOpen &&
                  (closeDate ? `This window closes ${closeDate}.` : "Please check back for the next cycle.")}
              </p>
              {submissionOpen && (
                <ButtonLink href="/ssip/apply">
                  Open SSIP application <ArrowRight size={16} />
                </ButtonLink>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}