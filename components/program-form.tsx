"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function ProgramForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const body = {
      name: data.get("name"),
      slug: data.get("slug"),
      type: data.get("type"),
      shortDescription: data.get("shortDescription"),
      description: data.get("description"),
      visibility: data.get("visibility"),
      participationMode: data.get("participationMode"),
      registrationOpenAt: data.get("registrationOpenAt") || null,
      registrationCloseAt: data.get("registrationCloseAt") || null,
      startAt: data.get("startAt") || null,
      endAt: data.get("endAt") || null,
      capacity: data.get("capacity") ? Number(data.get("capacity")) : null,
      teamMinSize: Number(data.get("teamMinSize") || 1),
      teamMaxSize: Number(data.get("teamMaxSize") || 1),
      waitlistEnabled: data.get("waitlistEnabled") === "on",
      requiresReview: data.get("requiresReview") === "on",
      allowsDrafts: data.get("allowsDrafts") === "on",
      allowsEditAfterSubmit: data.get("allowsEditAfterSubmit") === "on",
      allowsWithdrawal: data.get("allowsWithdrawal") === "on",
      editDeadline: data.get("editDeadline") || null,
      requiresAuth: data.get("requiresAuth") === "on",
      blindReview: data.get("blindReview") === "on",
      allowedEmailDomains: String(data.get("allowedEmailDomains") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };
    try {
      const response = await fetch("/api/programs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        fields?: Record<string, unknown>;
        program?: { id: string };
      };
      if (!response.ok) {
        const fieldErrors = result.fields
          ? Object.entries(result.fields)
              .flatMap(([field, messages]) =>
                (Array.isArray(messages) ? messages : [messages]).map((message) => `${field}: ${String(message)}`),
              )
              .join(" ")
          : "";
        setError(
          fieldErrors
            ? `${result.error ?? "Please check the submitted information"} ${fieldErrors}`
            : (result.error ?? "Unable to create program"),
        );
        return;
      }
      if (!result.program?.id) {
        setError("The program was created but no program reference was returned. Refresh and check Programs.");
        return;
      }
      router.push(`/admin/programs/${result.program.id}`);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel form-panel" onSubmit={submit}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="name">Program name</label>
          <input className="input" id="name" name="name" required minLength={3} placeholder="UDHBHAV 2026" />
        </div>
        <div className="field">
          <label htmlFor="slug">Slug</label>
          <input className="input" id="slug" name="slug" required pattern={"[a-z0-9\\-]+"} placeholder="udbhav-2026" />
        </div>
        <div className="field">
          <label htmlFor="type">Program type</label>
          <select className="select" id="type" name="type">
            <option value="STARTUP_COMPETITION">Startup competition</option>
            <option value="EVENT">Event</option>
            <option value="SSIP">SSIP</option>
            <option value="WORKSHOP">Workshop</option>
            <option value="INDUSTRY_VISIT">Industry visit</option>
            <option value="HACKATHON">Hackathon</option>
            <option value="MENTORSHIP">Mentorship</option>
            <option value="PITCH_EVENT">Pitch event</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="visibility">Visibility</label>
          <select className="select" id="visibility" name="visibility">
            <option value="PUBLIC">Public</option>
            <option value="UNLISTED">Unlisted</option>
            <option value="PRIVATE">Private</option>
          </select>
        </div>
        <div className="field field-full">
          <label htmlFor="shortDescription">Short description</label>
          <input
            className="input"
            id="shortDescription"
            name="shortDescription"
            required
            minLength={10}
            maxLength={220}
            placeholder="A concise summary shown on program cards"
          />
        </div>
        <div className="field field-full">
          <label htmlFor="description">Detailed description</label>
          <textarea
            className="textarea"
            id="description"
            name="description"
            required
            minLength={20}
            placeholder="Purpose, eligibility, outcomes, and important context"
          />
        </div>
        <div className="field">
          <label htmlFor="registrationOpenAt">Registration opens</label>
          <input className="input" type="datetime-local" id="registrationOpenAt" name="registrationOpenAt" />
        </div>
        <div className="field">
          <label htmlFor="registrationCloseAt">Registration closes</label>
          <input className="input" type="datetime-local" id="registrationCloseAt" name="registrationCloseAt" />
        </div>
        <div className="field">
          <label htmlFor="startAt">Program starts</label>
          <input className="input" type="datetime-local" id="startAt" name="startAt" />
        </div>
        <div className="field">
          <label htmlFor="endAt">Program ends</label>
          <input className="input" type="datetime-local" id="endAt" name="endAt" />
        </div>
        <div className="field">
          <label htmlFor="editDeadline">Post-submission edit deadline</label>
          <input className="input" type="datetime-local" id="editDeadline" name="editDeadline" />
        </div>
        <div className="field">
          <label htmlFor="participationMode">Participation</label>
          <select className="select" id="participationMode" name="participationMode">
            <option value="INDIVIDUAL">Individual</option>
            <option value="TEAM">Team</option>
            <option value="BOTH">Individual or team</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="capacity">Capacity (optional)</label>
          <input className="input" type="number" min="1" id="capacity" name="capacity" />
        </div>
        <div className="field">
          <label htmlFor="teamMinSize">Minimum team size</label>
          <input className="input" type="number" min="1" id="teamMinSize" name="teamMinSize" defaultValue="1" />
        </div>
        <div className="field">
          <label htmlFor="teamMaxSize">Maximum team size</label>
          <input className="input" type="number" min="1" id="teamMaxSize" name="teamMaxSize" defaultValue="1" />
        </div>
        <div className="field field-full">
          <label htmlFor="allowedEmailDomains">Allowed email domains (comma-separated, optional)</label>
          <input className="input" id="allowedEmailDomains" name="allowedEmailDomains" placeholder="iiitsurat.ac.in" />
        </div>
        <div className="check-row field-full">
          <label>
            <input type="checkbox" name="waitlistEnabled" /> Enable waitlist at capacity
          </label>
          <label>
            <input type="checkbox" name="requiresReview" /> Evaluation required
          </label>
          <label>
            <input type="checkbox" name="allowsEditAfterSubmit" /> Allow edits after submission
          </label>
          <label>
            <input type="checkbox" name="allowsDrafts" defaultChecked /> Allow saved drafts
          </label>
          <label>
            <input type="checkbox" name="allowsWithdrawal" defaultChecked /> Allow withdrawal
          </label>
          <label>
            <input type="checkbox" name="requiresAuth" defaultChecked /> Require authenticated applicants
          </label>
          <label>
            <input type="checkbox" name="blindReview" /> Blind review
          </label>
        </div>
        {error && (
          <div className="form-error field-full" role="alert">
            {error}
          </div>
        )}
        <p className="field-help field-full">
          New programs start as drafts. After creation, publish the form, then launch registration from the program overview.
        </p>
        <div className="form-actions">
          <Link className="button button-secondary" href="/admin/programs">
            Cancel
          </Link>
          <button className="button button-primary" type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create program"}
          </button>
        </div>
      </div>
    </form>
  );
}
