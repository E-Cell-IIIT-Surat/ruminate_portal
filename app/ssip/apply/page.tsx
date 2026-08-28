import type { Metadata } from "next";
import type { Session } from "next-auth";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { auth } from "@/auth";
import { AuthGate } from "@/components/auth-gate";
import { PublicHeader } from "@/components/public-header";
import { SSIPSubmissionForm } from "@/components/ssip-submission-form";
import { Badge, ButtonLink } from "@/components/ui";
import { db } from "@/lib/db";
import { hasDatabaseConfig } from "@/lib/env";

export const metadata: Metadata = { title: "Apply to SSIP" };
export const dynamic = "force-dynamic";

function isSubmissionWindowOpen(
  settings: {
    isOpen: boolean;
    opensAt: Date | null;
    closesAt: Date | null;
  } | null,
) {
  if (!settings?.isOpen) return false;
  const now = Date.now();
  if (settings.opensAt && now < settings.opensAt.getTime()) return false;
  if (settings.closesAt && now > settings.closesAt.getTime()) return false;
  return true;
}

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : null;
}

export default async function SsipApplyPage() {
  let session: Session | null = null;
  try {
    session = await auth();
  } catch (error) {
    console.error("[ssip/apply] session read failed", error);
  }

  if (!session?.user?.id) return <AuthGate title="Sign in to apply to SSIP" />;

  let settings: { isOpen: boolean; opensAt: Date | null; closesAt: Date | null } | null = null;
  if (hasDatabaseConfig()) {
    try {
      settings = await db.sSIPSettings.findUnique({
        where: { id: "default" },
        select: { isOpen: true, opensAt: true, closesAt: true },
      });
    } catch (error) {
      console.error("[ssip/apply] database read failed", error);
    }
  }

  const open = isSubmissionWindowOpen(settings);
  const opensAt = formatDate(settings?.opensAt);
  const closesAt = formatDate(settings?.closesAt);

  return (
    <div className="public-page ssip-page">
      <PublicHeader />
      <main className="public-container">
        <div className="page-back-link">
          <ButtonLink href="/ssip" variant="secondary">
            <ArrowLeft size={16} /> Back to SSIP
          </ButtonLink>
        </div>
        <section className="program-detail-hero ssip-hero">
          <div>
            <Badge tone="blue">SSIP application</Badge>
            <h1>Turn a strong idea into a clear proposal.</h1>
            <p>
              Tell the SSIP team what you are solving, how you will build it, and the support your team needs to move
              forward.
            </p>
          </div>
          <div className="ssip-hero-stat">
            <CalendarClock size={30} />
            <strong>{open ? "Applications are open" : "Applications are closed"}</strong>
            <span>{open ? "Your proposal can be submitted now." : "Check the next submission window below."}</span>
          </div>
        </section>

        <section className="panel ssip-application-panel" aria-labelledby="ssip-apply-title">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Proposal form</p>
              <h2 id="ssip-apply-title">Submit your SSIP idea</h2>
            </div>
            <Badge tone={open ? "green" : "orange"}>{open ? "OPEN" : "CLOSED"}</Badge>
          </div>
          {open ? (
            <>
              <p className="muted">
                You are signed in as {session.user.email ?? session.user.name ?? "your account"}. Required fields are
                marked with an asterisk.
              </p>
              <SSIPSubmissionForm defaults={{ name: session.user.name, email: session.user.email }} />
            </>
          ) : (
            <div className="ssip-window-notice">
              <CalendarClock size={22} />
              <div>
                <h3>Applications are not open right now</h3>
                <p>
                  {opensAt ? `The next window opens ${opensAt}. ` : "The next window will be announced soon. "}
                  {closesAt ? `This cycle closes ${closesAt}.` : "Please check back for the next cycle."}
                </p>
                <ButtonLink href="/ssip" variant="secondary">
                  View SSIP details <ArrowLeft size={16} />
                </ButtonLink>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
