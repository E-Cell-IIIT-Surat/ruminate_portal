import type { Metadata } from "next";
import { PublicHeader } from "@/components/public-header";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="public-page legal-page">
      <PublicHeader />
      <main className="public-container legal-container">
        <PageHeader
          eyebrow="Your data"
          title="Privacy Policy"
          description="Plain-language information about how Ruminate handles portal data."
        />
        <article className="panel legal-copy">
          <p className="legal-updated">Last updated: 27 August 2026</p>
          <h2>What we collect</h2>
          <p>
            When you use Ruminate, we may collect your name, email address, profile details, application content, team
            information, review responses, and files you choose to upload.
          </p>
          <h2>Why we use it</h2>
          <p>
            We use this information to operate E-Cell IIIT Surat programs, receive and evaluate applications, manage
            teams and workshops, communicate updates, and provide a clear record of decisions and outcomes.
          </p>
          <h2>How it is stored</h2>
          <p>
            Portal records are stored in PostgreSQL. Private uploaded files are stored in Cloudflare R2 and are
            delivered through short-lived signed links. We use Google OAuth when you choose Google sign-in.
          </p>
          <h2>Sharing and retention</h2>
          <p>
            We do not sell your personal data. Information is shared only with authorized E-Cell administrators,
            faculty, and reviewers who need it to run the relevant program. We retain records for operational, audit,
            and reporting needs, then remove or anonymize them when they are no longer needed.
          </p>
          <h2>Your choices</h2>
          <p>
            You can ask the E-Cell team to review, correct, or delete your account information, subject to records we
            must retain for audit or legal purposes.
          </p>
          <h2>Contact</h2>
          <p>
            Questions about privacy can be sent to{" "}
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
