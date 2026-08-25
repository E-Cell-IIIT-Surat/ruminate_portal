import type { Metadata } from "next";
import {
  ArrowRight,
  BookOpen,
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

export default async function SsipPage() {
  const program = hasDatabaseConfig()
    ? await db.program.findFirst({
        where: { slug: { in: ["ssip", "ssip-demo"] }, archivedAt: null },
        select: { slug: true, status: true },
      })
    : null;
  const formHref = program ? `/programs/${program.slug}` : "/programs";
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
                {program ? "Open the SSIP application" : "Explore SSIP opportunities"} <ArrowRight size={17} />
              </ButtonLink>
              <a
                className="button button-secondary"
                href="https://iiitsurat.ac.in/static/media/TNP_Brochure_2024_25_U1.ab56caebb7fda60d5b09.pdf"
                target="_blank"
                rel="noreferrer"
              >
                Official SSIP overview <ExternalLink size={15} />
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
            <h2>How to use this portal</h2>
            <ol className="ssip-steps">
              <li>
                <b>Sign in</b>
                <span>Use Google or create an account with your email and password.</span>
              </li>
              <li>
                <b>Read the brief</b>
                <span>Check eligibility, dates, team size, and what evidence is expected.</span>
              </li>
              <li>
                <b>Submit once, improve continuously</b>
                <span>Save a draft, upload supporting files, and respond to review feedback.</span>
              </li>
              <li>
                <b>Follow the decision</b>
                <span>See status updates, reviewer progress, and announcements from your portal.</span>
              </li>
            </ol>
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
      </main>
    </div>
  );
}
