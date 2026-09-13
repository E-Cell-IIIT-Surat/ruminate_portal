"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeleteEventButton } from "@/components/delete-event-button";
import { AdminHelp } from "@/components/admin-help";
import { eventTimeInput, eventTimeToIso } from "@/lib/domain/event-time";

type ProgramLaunchChecklistProps = {
  programId: string;
  status: string;
  formPublished: boolean;
  formVersion?: number;
  registrationCloseAt?: string;
  visibility?: string;
};

export function ProgramLaunchChecklist({
  programId,
  status,
  formPublished,
  formVersion,
  registrationCloseAt,
  visibility,
}: ProgramLaunchChecklistProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const currentStatus = status;
  const [mode, setMode] = useState("now");
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState(() => eventTimeInput(registrationCloseAt));
  async function launch(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/programs/${programId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "launch",
          mode,
          opensAt: mode === "schedule" ? eventTimeToIso(opensAt) : undefined,
          closesAt: eventTimeToIso(closesAt),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not launch registration");
      setMessage(
        mode === "now"
          ? "Registration is open. Public programs now appear in the program directory."
          : "Scheduled. Registration will open automatically at the chosen time.",
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not launch registration");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(nextStatus: "REGISTRATION_OPEN" | "REGISTRATION_CLOSED") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/programs/${programId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "set_status", status: nextStatus }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; program?: { status?: string } };
      if (!response.ok) throw new Error(result.error ?? "Unable to update the program status");
      setMessage(nextStatus === "REGISTRATION_OPEN" ? "Registration is live" : "Registration is closed");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update the program status");
    } finally {
      setBusy(false);
    }
  }

  const launched = ["REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS", "COMPLETED"].includes(currentStatus);
  const canLaunch = formPublished && currentStatus !== "ARCHIVED";
  const canClose = currentStatus === "REGISTRATION_OPEN";
  return (
    <section className="panel launch-checklist" aria-labelledby="launch-checklist-title">
      <div className="launch-checklist-header">
        <div>
          <p className="eyebrow">Launch checklist</p>
          <h2 id="launch-checklist-title">
            Create once, then open registration{" "}
            <AdminHelp
              title="Launch registration"
              description="Publish the form first. Launch now opens registration immediately; Schedule opens it at the chosen IST time. Set a closing date and Public visibility if the event should appear in its directory."
            />
          </h2>
          <p>Complete the form, publish it, and use this panel whenever you want to open or close applications.</p>
        </div>
        <span className={`launch-status launch-status-${launched ? "ready" : "draft"}`}>
          {currentStatus.replaceAll("_", " ")}
        </span>
      </div>
      <div className="launch-steps" aria-label="Program launch steps">
        <div className={formPublished ? "launch-step is-complete" : "launch-step is-current"}>
          <span className="launch-step-number">01</span>
          <div>
            <strong>Build the form</strong>
            <small>
              {formPublished
                ? `Version ${formVersion ?? "published"} is ready`
                : "Add the questions applicants will answer"}
            </small>
          </div>
        </div>
        <div className={canLaunch || launched ? "launch-step is-complete" : "launch-step is-current"}>
          <span className="launch-step-number">02</span>
          <div>
            <strong>Open registration</strong>
            <small>
              {canLaunch
                ? "One click makes the program visible and accepting responses"
                : launched
                  ? "Applicants can see the current program state"
                  : "Publish the form first"}
            </small>
          </div>
        </div>
        <div className={currentStatus === "COMPLETED" ? "launch-step is-complete" : "launch-step"}>
          <span className="launch-step-number">03</span>
          <div>
            <strong>Manage the run</strong>
            <small>Review applications, assign reviewers, and publish outcomes</small>
          </div>
        </div>
      </div>
      <div className="launch-checklist-actions">
        <Link className="button button-secondary" href={`/admin/programs/${programId}/form`}>
          {formPublished ? "Manage form" : "Build form"}
        </Link>
        {canClose && (
          <button
            className="button button-secondary"
            type="button"
            disabled={busy}
            onClick={() => setStatus("REGISTRATION_CLOSED")}
          >
            {busy ? "Updating…" : "Close registration"}
          </button>
        )}
        {message && (
          <span className="config-state" role="status">
            {message}
          </span>
        )}
      </div>
      {canLaunch && (
        <form onSubmit={launch} className="launch-controls">
          <label>
            When should registration open?
            <select value={mode} onChange={(event) => setMode(event.target.value)} disabled={busy}>
              <option value="now">Launch now / reopen now</option>
              <option value="schedule">Schedule registration</option>
            </select>
          </label>
          {mode === "schedule" && (
            <label>
              Opening time (IST)
              <input
                required
                type="datetime-local"
                value={opensAt}
                onChange={(event) => setOpensAt(event.target.value)}
                disabled={busy}
              />
            </label>
          )}
          <label>
            Closing time (IST)
            <input
              required
              type="datetime-local"
              value={closesAt}
              onChange={(event) => setClosesAt(event.target.value)}
              disabled={busy}
            />
          </label>
          <button className="button button-primary" disabled={busy}>
            {busy ? "Saving…" : mode === "now" ? "Launch now" : "Schedule registration"}
          </button>
        </form>
      )}
      {visibility !== "PUBLIC" && (
        <p>
          This program is {visibility?.toLowerCase()}. Choose Public in Settings to show it on the homepage and program
          directory.
        </p>
      )}
      <p>
        <Link href="/admin/programs/guide">Read the event launch guide</Link>
      </p>
      <DeleteEventButton
        endpoint={`/api/admin/programs/${programId}`}
        name="this program"
        redirectTo="/admin/programs"
      />
    </section>
  );
}
