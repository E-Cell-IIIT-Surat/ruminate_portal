"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function dateValue(value?: Date | string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}

export function UdbhavCycleControl({
  initial,
}: {
  initial: {
    id?: string;
    month: number;
    year: number;
    opensAt: Date | string;
    closesAt: Date | string;
    status: string;
  };
}) {
  const router = useRouter();
  const [state, setState] = useState("");
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("Saving…");
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/udbhav/cycle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    setState(response.ok ? "Cycle updated" : (result.error ?? "Unable to update cycle"));
    if (response.ok) router.refresh();
  }
  return (
    <form className="panel form-panel" onSubmit={save}>
      <div className="panel-header">
        <div>
          <span className="eyebrow">Monthly form control</span>
          <h2>UdbhAV cycle window</h2>
        </div>
        <span className="config-state" role="status">
          {state}
        </span>
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="udbhav-month">Month</label>
          <input
            id="udbhav-month"
            className="input"
            name="month"
            type="number"
            min="1"
            max="12"
            defaultValue={initial.month}
          />
        </div>
        <div className="field">
          <label htmlFor="udbhav-year">Year</label>
          <input id="udbhav-year" className="input" name="year" type="number" min="2025" defaultValue={initial.year} />
        </div>
        <div className="field">
          <label htmlFor="udbhav-opens">Opens at</label>
          <input
            id="udbhav-opens"
            className="input"
            name="opensAt"
            type="datetime-local"
            defaultValue={dateValue(initial.opensAt)}
          />
        </div>
        <div className="field">
          <label htmlFor="udbhav-closes">Closes at</label>
          <input
            id="udbhav-closes"
            className="input"
            name="closesAt"
            type="datetime-local"
            defaultValue={dateValue(initial.closesAt)}
          />
        </div>
        <div className="field">
          <label htmlFor="udbhav-cycle-status">Status</label>
          <select id="udbhav-cycle-status" className="select" name="status" defaultValue={initial.status}>
            <option>SCHEDULED</option>
            <option>OPEN</option>
            <option>CLOSED</option>
          </select>
        </div>
      </div>
      <button className="button button-primary">Save cycle</button>
    </form>
  );
}

export function UdbhavStatusControl({ id, initial, stage }: { id: string; initial: string; stage: string }) {
  const [status, setStatus] = useState(initial);
  const [state, setState] = useState("");
  async function save() {
    setState("Saving…");
    const response = await fetch(`/api/udbhav/submissions/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, currentStage: stage }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    setState(response.ok ? "Saved" : (result.error ?? "Failed"));
  }
  return (
    <div className="status-control">
      <select value={status} onChange={(event) => setStatus(event.target.value)}>
        <option>SUBMITTED</option>
        <option>UNDER_REVIEW</option>
        <option>IN_PROGRESS</option>
        <option>ON_HOLD</option>
        <option>ACTION_NEEDED</option>
        <option>PITCH_SCHEDULED</option>
        <option>ACCEPTED</option>
        <option>REJECTED</option>
      </select>
      <button type="button" className="button button-secondary" onClick={save}>
        Save
      </button>
      {state && <small>{state}</small>}
    </div>
  );
}
