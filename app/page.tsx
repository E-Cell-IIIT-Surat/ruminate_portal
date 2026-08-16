import { ArrowRight, Blocks, FileCheck2, ShieldCheck, Sparkles } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { ButtonLink } from "@/components/ui";
import { Brand } from "@/components/brand";
import Link from "next/link";

export default function Home() {
  return (
    <div className="site-page">
      <PublicHeader />
      <main>
        <section className="hero">
          <div className="hero-orb hero-orb-one" />
          <div className="hero-orb hero-orb-two" />
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-content">
            <div className="kicker">
              <Sparkles size={15} /> Ruminate operations platform
            </div>
            <h1>
              Ideas move forward
              <br />
              <span>when the process does.</span>
            </h1>
            <p>
              One secure portal for programs, applications, teams, reviews, and outcomes at Ruminate — E-Cell IIIT
              Surat.
            </p>
            <div className="hero-actions">
              <ButtonLink href="/programs">
                Explore programs <ArrowRight size={17} />
              </ButtonLink>
              <ButtonLink href="/dashboard" variant="secondary">
                Go to my portal
              </ButtonLink>
            </div>
            <div className="trust-row">
              <span>
                <ShieldCheck size={16} /> Private by design
              </span>
              <span>
                <Blocks size={16} /> One reusable engine
              </span>
              <span>
                <FileCheck2 size={16} /> Structured reviews
              </span>
            </div>
          </div>
          <div className="workflow-card">
            <div className="workflow-top">
              <span>APPLICATION JOURNEY</span>
              <span className="live-dot">Live</span>
            </div>
            <div className="workflow-item done">
              <span>01</span>
              <div>
                <strong>Application submitted</strong>
                <small>Responses and documents received</small>
              </div>
              <b>✓</b>
            </div>
            <div className="workflow-line" />
            <div className="workflow-item active">
              <span>02</span>
              <div>
                <strong>Under review</strong>
                <small>2 of 3 reviews complete</small>
              </div>
              <b>67%</b>
            </div>
            <div className="workflow-progress">
              <i />
            </div>
            <div className="workflow-line muted" />
            <div className="workflow-item">
              <span>03</span>
              <div>
                <strong>Decision</strong>
                <small>Published when ready</small>
              </div>
            </div>
            <div className="workflow-foot">
              <span>Reference</span>
              <strong>UDB-2026-0182</strong>
            </div>
          </div>
        </section>
        <section className="engine-section">
          <div>
            <p className="eyebrow">Built for every initiative</p>
            <h2>A single engine. Many possibilities.</h2>
            <p>
              Core members configure the program, form, team rules, stages, rubric, and reviewers—without changing
              source code.
            </p>
          </div>
          <div className="program-chips">
            <span>UdbhAV</span>
            <span>SSIP</span>
            <span>Abhyudaya</span>
            <span>Hackathons</span>
            <span>Industry visits</span>
            <span>Workshops</span>
          </div>
        </section>
      </main>
      <footer>
        <Brand />
        <span>© 2026 Ruminate — E-Cell IIIT Surat</span>
        <Link href="/programs">Browse programs</Link>
      </footer>
    </div>
  );
}
