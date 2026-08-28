"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ProgramLaunchChecklistProps = {
  programId: string;
  status: string;
  formPublished: boolean;
  formVersion?: number;
};

export function ProgramLaunchChecklist({ programId, status, formPublished, formVersion }: ProgramLaunchChecklistProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [currentStatus, setCurrentStatus] = useState(status);

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
      setCurrentStatus(result.program?.status ?? nextStatus);
      setMessage(nextStatus === "REGISTRATION_OPEN" ? "Registration is live" : "Registration is closed");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update the program status");
    } finally {
      setBusy(false);
    }
  }

  const launched = ["REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS", "COMPLETED"].includes(currentStatus);
  const canLaunch = formPublished && ["DRAFT", "PUBLISHED"].includes(currentStatus);
  const canClose = currentStatus === "REGISTRATION_OPEN";
  return (
    <section className="panel launch-checklist" aria-labelledby="launch-checklist-title">
      <div className="launch-checklist-header">
        <div>
          <p className="eyebrow">Launch checklist</p>
          <h2 id="launch-checklist-title">Create once, then open registration</h2>
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
            <small>{formPublished ? `Version ${formVersion ?? "published"} is ready` : "Add the questions applicants will answer"}</small>
          </div>
        </div>
        <div className={canLaunch || launched ? "launch-step is-complete" : "launch-step is-current"}>
          <span className="launch-step-number">02</span>
          <div>
            <strong>Open registration</strong>
            <small>{canLaunch ? "One click makes the program visible and accepting responses" : launched ? "Applicants can see the current program state" : "Publish the form first"}</small>
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
        {canLaunch && (
          <button className="button button-primary" type="button" disabled={busy} onClick={() => setStatus("REGISTRATION_OPEN")}>
            {busy ? "Launching…" : "Launch registration"}
          </button>
        )}
        {canClose && (
          <button className="button button-secondary" type="button" disabled={busy} onClick={() => setStatus("REGISTRATION_CLOSED")}>
            {busy ? "Updating…" : "Close registration"}
          </button>
        )}
        {message && <span className="config-state" role="status">{message}</span>}
      </div>
    </section>
  );
}
