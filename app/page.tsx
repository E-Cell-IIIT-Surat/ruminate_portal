import Image from "next/image";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Blocks,
  ClipboardCheck,
  FileCheck2,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { SparkField } from "@/components/spark-field";
import { ButtonLink } from "@/components/ui";

const initiatives = [
  {
    label: "Flagship event",
    title: "UdbhAV",
    body: "Take an idea from first spark to a sharper, more confident pitch.",
    href: "/udbhav",
    accent: "orange",
  },
  {
    label: "Student innovation",
    title: "SSIP",
    body: "Build with structure, mentorship, and a clear path to the next milestone.",
    href: "/ssip",
    accent: "violet",
  },
  {
    label: "Learn by doing",
    title: "Financial literacy",
    body: "Reserve a seat for practical conversations about money, markets, and choices.",
    href: "/financial-literacy-workshop",
    accent: "green",
  },
];

const process = [
  ["01", "Discover", "Find an initiative that matches your curiosity and ambition."],
  ["02", "Apply", "Tell us about your idea, your team, and what you want to build."],
  ["03", "Get reviewed", "A structured rubric keeps feedback thoughtful, consistent, and fair."],
  ["04", "Move forward", "Track decisions, next steps, and outcomes from one secure portal."],
];

export default function Home() {
  return (
    <div className="site-page">
      <PublicHeader />
      <main>
        <SparkField />
        <section className="hero home-hero">
          <div className="hero-orb hero-orb-one" />
          <div className="hero-orb hero-orb-two" />
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-content">
            <div className="kicker">
              <Sparkles size={15} /> Ruminate operations platform
            </div>
            <h1>
              Make the spark
              <br />
              <span>easier to follow.</span>
            </h1>
            <p>
              Ruminate is the digital home for entrepreneurship at E-Cell IIIT Surat — where students discover
              opportunities, submit ideas, and keep moving with clarity.
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
                <LockKeyhole size={16} /> Private by design
              </span>
              <span>
                <Blocks size={16} /> One reusable engine
              </span>
              <span>
                <ClipboardCheck size={16} /> Structured reviews
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-logo-card" aria-label="Ruminate, E-Cell IIIT Surat">
              <Image src="/ruminate-logo.png" alt="Ruminate — E-Cell IIIT Surat" width={260} height={260} priority />
              <span className="hero-logo-glow" />
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
                  <small>Thoughtful feedback from reviewers</small>
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
          </div>
        </section>

        <section className="signal-strip" aria-label="Platform highlights">
          <div>
            <strong>01</strong>
            <span>One place to apply</span>
          </div>
          <div>
            <strong>02</strong>
            <span>One clear review trail</span>
          </div>
          <div>
            <strong>03</strong>
            <span>One next step at a time</span>
          </div>
          <ArrowDownRight className="signal-arrow" size={22} />
        </section>

        <section className="story-section reveal">
          <div className="section-heading">
            <p className="eyebrow">Why this portal exists</p>
            <h2>Less chasing. More building.</h2>
          </div>
          <div className="story-copy">
            <p>
              Great ideas deserve a process that feels as considered as the idea itself. Ruminate brings forms, files,
              teams, reviewers, decisions, and updates into one calm workspace.
            </p>
            <Link className="text-link" href="https://ecelliiitsurat.in/" target="_blank" rel="noreferrer">
              Meet the ecosystem <ArrowRight size={16} />
            </Link>
          </div>
          <div className="value-grid">
            <article className="value-card value-card-featured">
              <div className="value-icon">
                <Search size={19} />
              </div>
              <span>01 / Find your lane</span>
              <h3>Opportunities with context</h3>
              <p>See what each program is for, who it is built for, and what happens after you apply.</p>
            </article>
            <article className="value-card">
              <div className="value-icon">
                <UsersRound size={19} />
              </div>
              <span>02 / Build together</span>
              <h3>Teams that stay in sync</h3>
              <p>Invite teammates, keep the application shared, and submit one strong story.</p>
            </article>
            <article className="value-card">
              <div className="value-icon">
                <ShieldCheck size={19} />
              </div>
              <span>03 / Trust the process</span>
              <h3>Feedback you can follow</h3>
              <p>Every review is assigned, rubric-led, and visible only to the people who need it.</p>
            </article>
          </div>
        </section>

        <section className="process-section reveal" id="how-it-works">
          <div className="section-heading centered-heading">
            <p className="eyebrow">How it works</p>
            <h2>From first thought to next chapter.</h2>
            <p>Designed to keep the journey visible — for participants, reviewers, and the people making it happen.</p>
          </div>
          <div className="process-grid">
            {process.map(([number, title, body]) => (
              <article className="process-card" key={number}>
                <span className="process-number">{number}</span>
                <div className="process-line" />
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="evaluation-section reveal">
          <div className="evaluation-panel">
            <div className="evaluation-mark">
              <BadgeCheck size={24} />
            </div>
            <p className="eyebrow">Evaluation, made human</p>
            <h2>Clear criteria. Better conversations.</h2>
            <p>
              Applications are reviewed through configurable rubrics. Reviewers see only the work assigned to them,
              while program teams get a complete, auditable picture of progress.
            </p>
            <Link className="text-link" href="/programs">
              See open programs <ArrowRight size={16} />
            </Link>
          </div>
          <div className="rubric-card">
            <div className="rubric-header">
              <span>ROUND 01 · SAMPLE RUBRIC</span>
              <strong>100 pts</strong>
            </div>
            {["Problem relevance", "Originality", "Feasibility", "Potential impact"].map((item, index) => (
              <div className="rubric-row" key={item}>
                <span>
                  <i>{String(index + 1).padStart(2, "0")}</i> {item}
                </span>
                <strong>{[25, 30, 20, 25][index]}</strong>
              </div>
            ))}
            <div className="rubric-foot">
              <FileCheck2 size={16} /> Weighted scores normalized to 100
            </div>
          </div>
        </section>

        <section className="initiatives-section reveal">
          <div className="section-heading">
            <p className="eyebrow">Choose your next move</p>
            <h2>There is room for every kind of spark.</h2>
          </div>
          <Link className="text-link" href="/programs">
            Browse all programs <ArrowRight size={16} />
          </Link>
          <div className="initiative-grid">
            {initiatives.map((initiative) => (
              <Link
                className={`initiative-card initiative-${initiative.accent}`}
                href={initiative.href}
                key={initiative.title}
              >
                <div className="initiative-top">
                  <span>{initiative.label}</span>
                  <ArrowUpRight size={18} />
                </div>
                <h3>{initiative.title}</h3>
                <p>{initiative.body}</p>
                <span className="initiative-cta">
                  Explore <ArrowRight size={15} />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="closing-cta reveal">
          <div>
            <p className="eyebrow">Your idea has a place here</p>
            <h2>Ready to give it a little momentum?</h2>
          </div>
          <ButtonLink href="/programs">
            Start exploring <ArrowRight size={17} />
          </ButtonLink>
        </section>
      </main>
      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-brand-block">
            <Image src="/ruminate-logo.png" alt="Ruminate — E-Cell IIIT Surat" width={180} height={180} />
            <div>
              <strong>Ruminate</strong>
              <span>E-Cell IIIT Surat</span>
            </div>
          </div>
          <div className="footer-tagline">
            <span>#fosterthespark</span>
            <p>Ideas, people, and opportunities — moving forward together.</p>
          </div>
          <div className="footer-links">
            <span>Explore</span>
            <Link href="/programs">Programs</Link>
            <Link href="/udbhav">UdbhAV</Link>
            <Link href="/ssip">SSIP</Link>
            <Link href="/financial-literacy-workshop">Workshop</Link>
          </div>
          <div className="footer-links">
            <span>Ruminate online</span>
            <a href="https://ecelliiitsurat.in/" target="_blank" rel="noreferrer">
              Official website
            </a>
            <a href="https://ecelliiitsurat.in/team" target="_blank" rel="noreferrer">
              Official team
            </a>
            <a href="https://teams.ecelliiitsurat.in/" target="_blank" rel="noreferrer">
              Ruminate network
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Ruminate — E-Cell IIIT Surat</span>
          <span>Built for curious minds and brave beginnings.</span>
        </div>
      </footer>
    </div>
  );
}
