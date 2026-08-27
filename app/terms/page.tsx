import type { Metadata } from "next";
import { PublicHeader } from "@/components/public-header";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <div className="public-page legal-page">
      <PublicHeader />
      <main className="public-container legal-container">
        <PageHeader
          eyebrow="Use the portal well"
          title="Terms of Use"
          description="The ground rules for using Ruminate."
        />
        <article className="panel legal-copy">
          <p className="legal-updated">Last updated: 27 August 2026</p>
          <h2>Platform purpose</h2>
          <p>
            Ruminate is the digital operations portal for E-Cell IIIT Surat programs, workshops, teams, applications,
            and reviews.
          </p>
          <h2>Acceptable use</h2>
          <p>
            Use an account that belongs to you, provide accurate information, respect other participants, and submit
            only content you have the right to share. Do not attempt to bypass access controls, disrupt the service, or
            upload harmful or unlawful material.
          </p>
          <h2>Review and decisions</h2>
          <p>
            Submitted content may be read by authorized administrators, faculty, program managers, and assigned
            reviewers. Decisions, scores, and feedback are made for the relevant program and may change as the process
            progresses.
          </p>
          <h2>Accounts and termination</h2>
          <p>
            We may suspend or terminate access for misuse, impersonation, security risks, or violations of these terms.
            You can stop using the portal at any time.
          </p>
          <h2>Service availability</h2>
          <p>
            The portal is provided as-is. We work to keep it reliable, but do not promise uninterrupted availability or
            a particular response time. We may maintain, change, or temporarily pause features when needed.
          </p>
          <h2>Contact</h2>
          <p>
            For questions, contact{" "}
            <a className="text-link" href="mailto:ruminate.ecell@iiitsurat.ac.in">
              ruminate.ecell@iiitsurat.ac.in
            </a>
            .
          </p>
        </article>
      </main>
    </div>
  );
}
