"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ProgramSettingsProps = {
  program: {
    id: string;
    name: string;
    slug: string;
    shortDescription: string;
    description: string;
    eligibility: string | null;
    instructions: string | null;
    status: string;
    visibility: string;
    type: string;
    participationMode: string;
    registrationOpenAt: string | null;
    registrationCloseAt: string | null;
    startAt: string | null;
    endAt: string | null;
    capacity: number | null;
    waitlistEnabled: boolean;
    teamMinSize: number;
    teamMaxSize: number;
    allowsEditAfterSubmit: boolean;
    editDeadline: string | null;
    requiresReview: boolean;
    allowsDrafts: boolean;
    requiresAuth: boolean;
    allowsWithdrawal: boolean;
    blindReview: boolean;
    allowedEmailDomains: string[];
    resultsPublishedAt: string | null;
  };
};

export function ProgramSettings({ program }: ProgramSettingsProps) {
  const router = useRouter();
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setState("Saving…");
    const data = new FormData(event.currentTarget);
    const body = {
      name: data.get("name"),
      slug: data.get("slug"),
      shortDescription: data.get("shortDescription"),
      description: data.get("description"),
      eligibility: data.get("eligibility") || null,
      instructions: data.get("instructions") || null,
      status: data.get("status"),
      visibility: data.get("visibility"),
      type: data.get("type"),
      participationMode: data.get("participationMode"),
      registrationOpenAt: data.get("registrationOpenAt") || null,
      registrationCloseAt: data.get("registrationCloseAt") || null,
      startAt: data.get("startAt") || null,
      endAt: data.get("endAt") || null,
      capacity: data.get("capacity") ? Number(data.get("capacity")) : null,
      waitlistEnabled: data.get("waitlistEnabled") === "on",
      teamMinSize: Number(data.get("teamMinSize")),
      teamMaxSize: Number(data.get("teamMaxSize")),
      allowsEditAfterSubmit: data.get("allowsEditAfterSubmit") === "on",
      editDeadline: data.get("editDeadline") || null,
      requiresReview: data.get("requiresReview") === "on",
      allowsDrafts: data.get("allowsDrafts") === "on",
      requiresAuth: data.get("requiresAuth") === "on",
      allowsWithdrawal: data.get("allowsWithdrawal") === "on",
      blindReview: data.get("blindReview") === "on",
      allowedEmailDomains: String(data.get("allowedEmailDomains") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };
    const response = await fetch(`/api/admin/programs/${program.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    setBusy(false);
    setState(response.ok ? "Settings saved" : (result.error ?? "Save failed"));
    if (response.ok) {
      setDirty(false);
      router.refresh();
    }
  }

  async function action(body: object) {
    setBusy(true);
    setState("Working…");
    const response = await fetch(`/api/admin/programs/${program.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    setBusy(false);
    setState(response.ok ? "Action completed" : (result.error ?? "Action failed"));
    if (response.ok && result.program?.id !== program.id) router.push(`/admin/programs/${result.program.id}`);
    else if (response.ok) router.refresh();
  }

  return (
    <>
      <form className="panel form-panel" onSubmit={save} onChange={() => setDirty(true)}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="name">Program name</label>
            <input className="input" id="name" name="name" defaultValue={program.name} required />
          </div>
          <div className="field">
            <label htmlFor="slug">Slug</label>
            <input className="input" id="slug" name="slug" defaultValue={program.slug} required />
          </div>
          <div className="field">
            <label htmlFor="status">Lifecycle status</label>
            <select className="select" id="status" name="status" defaultValue={program.status}>
              {[
                "DRAFT",
                "PUBLISHED",
                "REGISTRATION_OPEN",
                "REGISTRATION_CLOSED",
                "IN_PROGRESS",
                "COMPLETED",
                "ARCHIVED",
              ].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="visibility">Visibility</label>
            <select className="select" id="visibility" name="visibility" defaultValue={program.visibility}>
              {["PUBLIC", "UNLISTED", "PRIVATE"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="type">Program type</label>
            <select className="select" id="type" name="type" defaultValue={program.type}>
              {[
                "EVENT",
                "WORKSHOP",
                "INDUSTRY_VISIT",
                "HACKATHON",
                "STARTUP_COMPETITION",
                "SSIP",
                "MENTORSHIP",
                "PITCH_EVENT",
                "OTHER",
              ].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="participationMode">Participation</label>
            <select
              className="select"
              id="participationMode"
              name="participationMode"
              defaultValue={program.participationMode}
            >
              <option value="INDIVIDUAL">Individual</option>
              <option value="TEAM">Team</option>
              <option value="BOTH">Individual or team</option>
            </select>
          </div>
          <div className="field field-full">
            <label htmlFor="shortDescription">Short description</label>
            <input
              className="input"
              id="shortDescription"
              name="shortDescription"
              defaultValue={program.shortDescription}
              required
            />
          </div>
          <div className="field field-full">
            <label htmlFor="description">Description</label>
            <textarea
              className="textarea"
              id="description"
              name="description"
              defaultValue={program.description}
              required
            />
          </div>
          <div className="field field-full">
            <label htmlFor="eligibility">Eligibility</label>
            <textarea
              className="textarea"
              id="eligibility"
              name="eligibility"
              defaultValue={program.eligibility ?? ""}
            />
          </div>
          <div className="field field-full">
            <label htmlFor="instructions">Instructions</label>
            <textarea
              className="textarea"
              id="instructions"
              name="instructions"
              defaultValue={program.instructions ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="registrationOpenAt">Registration opens</label>
            <input
              className="input"
              type="datetime-local"
              id="registrationOpenAt"
              name="registrationOpenAt"
              defaultValue={program.registrationOpenAt ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="registrationCloseAt">Registration closes</label>
            <input
              className="input"
              type="datetime-local"
              id="registrationCloseAt"
              name="registrationCloseAt"
              defaultValue={program.registrationCloseAt ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="startAt">Program starts</label>
            <input
              className="input"
              type="datetime-local"
              id="startAt"
              name="startAt"
              defaultValue={program.startAt ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="endAt">Program ends</label>
            <input className="input" type="datetime-local" id="endAt" name="endAt" defaultValue={program.endAt ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="editDeadline">Post-submission edit deadline</label>
            <input
              className="input"
              type="datetime-local"
              id="editDeadline"
              name="editDeadline"
              defaultValue={program.editDeadline ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="capacity">Capacity</label>
            <input
              className="input"
              type="number"
              min="1"
              id="capacity"
              name="capacity"
              defaultValue={program.capacity ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="teamMinSize">Minimum team size</label>
            <input
              className="input"
              type="number"
              min="1"
              id="teamMinSize"
              name="teamMinSize"
              defaultValue={program.teamMinSize}
            />
          </div>
          <div className="field">
            <label htmlFor="teamMaxSize">Maximum team size</label>
            <input
              className="input"
              type="number"
              min="1"
              id="teamMaxSize"
              name="teamMaxSize"
              defaultValue={program.teamMaxSize}
            />
          </div>
          <div className="field">
            <label htmlFor="allowedEmailDomains">Allowed email domains</label>
            <input
              className="input"
              id="allowedEmailDomains"
              name="allowedEmailDomains"
              defaultValue={program.allowedEmailDomains.join(", ")}
            />
          </div>
          <div className="check-row field-full">
            <label>
              <input type="checkbox" name="waitlistEnabled" defaultChecked={program.waitlistEnabled} /> Enable waitlist
            </label>
            <label>
              <input type="checkbox" name="allowsEditAfterSubmit" defaultChecked={program.allowsEditAfterSubmit} />{" "}
              Allow post-submission edits
            </label>
            <label>
              <input type="checkbox" name="requiresReview" defaultChecked={program.requiresReview} /> Evaluation
              required
            </label>
            <label>
              <input type="checkbox" name="allowsDrafts" defaultChecked={program.allowsDrafts} /> Allow saved drafts
            </label>
            <label>
              <input type="checkbox" name="requiresAuth" defaultChecked={program.requiresAuth} /> Require authenticated
              applicants
            </label>
            <label>
              <input type="checkbox" name="allowsWithdrawal" defaultChecked={program.allowsWithdrawal} /> Allow
              withdrawal
            </label>
            <label>
              <input type="checkbox" name="blindReview" defaultChecked={program.blindReview} /> Blind review
            </label>
          </div>
          <div className="form-actions">
            <span className="config-state" role="status">
              {state}
            </span>
            <button className="button button-primary" disabled={busy}>
              {busy ? "Saving…" : "Save settings"}
            </button>
          </div>
        </div>
      </form>
      <div className="panel form-panel">
        <div className="panel-header">
          <div>
            <h2>Results</h2>
            <p>
              {program.resultsPublishedAt
                ? "Results are visible to participants."
                : "Decision statuses remain private until publication."}
            </p>
          </div>
          {!program.resultsPublishedAt && (
            <button
              className="button button-primary"
              disabled={busy}
              onClick={() => action({ action: "publish_results" })}
            >
              Publish results
            </button>
          )}
        </div>
      </div>
      <DuplicateProgram source={program} busy={busy} onDuplicate={action} />
    </>
  );
}

function DuplicateProgram({
  source,
  busy,
  onDuplicate,
}: {
  source: ProgramSettingsProps["program"];
  busy: boolean;
  onDuplicate(body: object): Promise<void>;
}) {
  const [name, setName] = useState(`${source.name} copy`);
  const [slug, setSlug] = useState(`${source.slug}-copy`);
  return (
    <div className="panel form-panel">
      <div className="panel-header">
        <div>
          <h2>Duplicate configuration</h2>
          <p>Copies the form, stages, rubrics, and settings—not applications or reviews.</p>
        </div>
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="duplicate-name">New name</label>
          <input className="input" id="duplicate-name" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="duplicate-slug">New slug</label>
          <input className="input" id="duplicate-slug" value={slug} onChange={(event) => setSlug(event.target.value)} />
        </div>
        <div className="form-actions">
          <button
            type="button"
            className="button button-secondary"
            disabled={busy}
            onClick={() => onDuplicate({ action: "duplicate", name, slug })}
          >
            Duplicate program
          </button>
        </div>
      </div>
    </div>
  );
}
