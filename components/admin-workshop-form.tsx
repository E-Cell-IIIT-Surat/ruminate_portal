"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminWorkshopForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setState("Saving workshop…");
    try {
      const form = new FormData(formElement);
      const body = Object.fromEntries(form.entries());
      const response = await fetch("/api/workshops", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      setState(response.ok ? "Workshop created" : (result.error ?? "Please check the dates and required fields."));
      if (response.ok) {
        formElement.reset();
        router.refresh();
      }
    } catch {
      setState("Unable to reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel form-panel" onSubmit={submit}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="workshop-name">Workshop name</label>
          <input className="input" id="workshop-name" name="name" required placeholder="Design thinking lab" />
        </div>
        <div className="field">
          <label htmlFor="workshop-slug">Slug</label>
          <input
            className="input"
            id="workshop-slug"
            name="slug"
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="design-thinking-lab"
          />
        </div>
        <div className="field">
          <label htmlFor="workshop-batch">Batch</label>
          <input className="input" id="workshop-batch" name="batch" placeholder="B.Tech / MBA" />
        </div>
        <div className="field">
          <label htmlFor="workshop-year">Year</label>
          <input
            className="input"
            id="workshop-year"
            name="year"
            type="number"
            inputMode="numeric"
            min="2000"
            max="2100"
            step="1"
            pattern="20\d{2}"
            placeholder="2026"
          />
        </div>
        <div className="field">
          <label htmlFor="workshop-venue">Venue</label>
          <input className="input" id="workshop-venue" name="venue" placeholder="IIIT Surat" />
        </div>
        <div className="field">
          <label htmlFor="workshop-capacity">Capacity</label>
          <input className="input" id="workshop-capacity" name="capacity" type="number" min="1" />
        </div>
        <div className="field field-full">
          <label htmlFor="workshop-summary">Short summary</label>
          <input
            className="input"
            id="workshop-summary"
            name="summary"
            required
            placeholder="A practical session for students"
          />
        </div>
        <div className="field field-full">
          <label htmlFor="workshop-description">Description</label>
          <textarea className="textarea" id="workshop-description" name="description" required minLength={20} />
        </div>
        <div className="field field-full">
          <label htmlFor="workshop-banner">Banner image URL (optional)</label>
          <input
            className="input"
            id="workshop-banner"
            name="bannerUrl"
            type="url"
            placeholder="https://.../workshop-banner.jpg"
          />
          <small className="field-help">Use a hosted image URL. It will be shown on the public workshop page.</small>
        </div>
        <div className="field">
          <label htmlFor="workshop-open">Registration opens</label>
          <input className="input" id="workshop-open" name="registrationOpenAt" type="datetime-local" />
        </div>
        <div className="field">
          <label htmlFor="workshop-close">Registration closes</label>
          <input className="input" id="workshop-close" name="registrationCloseAt" type="datetime-local" />
        </div>
        <div className="field">
          <label htmlFor="workshop-start">Workshop starts</label>
          <input className="input" id="workshop-start" name="startsAt" type="datetime-local" />
        </div>
        <div className="field">
          <label htmlFor="workshop-end">Workshop ends</label>
          <input className="input" id="workshop-end" name="endsAt" type="datetime-local" />
        </div>
        <div className="field">
          <label htmlFor="workshop-status">Status</label>
          <select className="select" id="workshop-status" name="status" defaultValue="DRAFT">
            <option>DRAFT</option>
            <option>PUBLISHED</option>
            <option>COMPLETED</option>
            <option>CANCELLED</option>
          </select>
        </div>
      </div>
      <div className="form-actions">
        <span className="config-state" role="status">
          {state}
        </span>
        <button className="button button-primary" disabled={busy}>
          {busy ? "Creating…" : "Create workshop"}
        </button>
      </div>
    </form>
  );
}
