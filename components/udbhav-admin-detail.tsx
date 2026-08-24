"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const statuses = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "IN_PROGRESS",
  "ON_HOLD",
  "ACTION_NEEDED",
  "PITCH_SCHEDULED",
  "ACCEPTED",
  "REJECTED",
] as const;

export function UdbhavAdminDetail({
  id,
  status,
  currentStage,
  secretMessage,
}: {
  id: string;
  status: string;
  currentStage: string;
  secretMessage: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState("");

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("Saving…");
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch(`/api/udbhav/submissions/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    setState(response.ok ? "Saved and participant notified" : (result.error ?? "Unable to save update"));
    if (response.ok) router.refresh();
  }

  return (
    <form className="panel form-panel" onSubmit={save}>
      <div className="panel-header">
        <div>
          <span className="eyebrow">Program team controls</span>
          <h2>Update idea</h2>
        </div>
        <span className="config-state" role="status">
          {state}
        </span>
      </div>
      <div className="form-grid-two">
        <label>
          Status
          <select className="select" name="status" defaultValue={status}>
            {statuses.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Current stage
          <input className="input" name="currentStage" defaultValue={currentStage} maxLength={120} required />
        </label>
      </div>
      <label>
        Private message to team leader
        <textarea
          className="textarea"
          name="secretMessage"
          defaultValue={secretMessage ?? ""}
          rows={5}
          maxLength={4000}
          placeholder="Only the submitting team will see this message."
        />
      </label>
      <label>
        Internal reason / audit note
        <textarea className="textarea" name="reason" rows={3} maxLength={1000} placeholder="Optional" />
      </label>
      <button className="button button-primary" type="submit">
        Save update and send notification
      </button>
    </form>
  );
}
